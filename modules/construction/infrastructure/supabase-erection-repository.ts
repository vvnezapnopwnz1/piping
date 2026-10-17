import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "@/lib/supabase/database.types"
import { ERECTION_STAGES, type ErectionStage } from "../domain/erection-stage"
import type { RftShortfallItem } from "../application/describe-erection-readiness"
import type { MaterialCheckPayload } from "../application/record-material-check"
import type { WeldProgressPayload } from "../application/record-weld-progress"
import { mapSupabaseConstructionError } from "./supabase-construction-errors"
import {
  applyBoolean,
  applyColumnKeyset,
  applyContains,
  applyDateRange,
  applyIsoKeyset,
  applyNumberRange,
  applySpoolSearch,
  applyStages,
  type DateRange,
  type IsoCursor,
  type NumberRange,
  type ProjectionRequest,
} from "./projection-keyset"

type Row = Record<string, any>

const fail = (error: { code?: string; message?: string } | null): void => {
  if (error) throw new Error(mapSupabaseConstructionError(error))
}

export interface ErectionReadiness {
  spoolRevisionId: string
  projectId: string
  isoNumber: string
  spoolNumber: string
  revisionNumber: string
  revisionStatus: string
  /**
   * Material evidence is phase-agnostic by design — one `material_check_records` row per spool
   * revision — so these three say `material`, not `field`. See the view's own comment and
   * T07-D2. The `field*` counters below are phase-filtered and do mean field-only work.
   */
  materialLineTotal: number
  materialLineChecked: number
  materialCheckedOn: string | null
  fieldWeldTotal: number
  fieldWeldComplete: number
  lastFieldWeldOn: string | null
  fieldSupportTotal: number
  fieldSupportRecorded: number
  lastFieldSupportOn: string | null
  toSiteOn: string | null
  erectedOn: string | null
  weldedBoltedOn: string | null
  supportedOn: string | null
  ndePending: number
  pwhtPending: number
  isRft: boolean
  rftOn: string | null
  rftBlockers: RftShortfallItem[]
}

export interface ErectionChartData {
  curve: Database["public"]["Functions"]["erection_progress_s_curve"]["Returns"]
  stages: Database["public"]["Functions"]["erection_stage_distribution"]["Returns"]
  blockers: Database["public"]["Functions"]["erection_rft_blocker_distribution"]["Returns"]
}

const numberOrZero = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value))

export function toErectionReadiness(row: Row): ErectionReadiness {
  return {
    spoolRevisionId: row.spool_revision_id,
    projectId: row.project_id,
    isoNumber: row.iso_number,
    spoolNumber: row.spool_number,
    revisionNumber: row.revision_number,
    revisionStatus: row.revision_status ?? "accepted",
    materialLineTotal: numberOrZero(row.material_line_total),
    materialLineChecked: numberOrZero(row.material_line_checked),
    materialCheckedOn: row.material_checked_on ?? null,
    fieldWeldTotal: numberOrZero(row.field_weld_total),
    fieldWeldComplete: numberOrZero(row.field_weld_complete),
    lastFieldWeldOn: row.last_field_weld_on ?? null,
    fieldSupportTotal: numberOrZero(row.field_support_total),
    fieldSupportRecorded: numberOrZero(row.field_support_recorded),
    lastFieldSupportOn: row.last_field_support_on ?? null,
    toSiteOn: row.to_site_on ?? null,
    erectedOn: row.erected_on ?? null,
    weldedBoltedOn: row.welded_bolted_on ?? null,
    supportedOn: row.supported_on ?? null,
    ndePending: numberOrZero(row.nde_pending),
    pwhtPending: numberOrZero(row.pwht_pending),
    isRft: row.is_rft === true,
    rftOn: row.rft_on ?? null,
    rftBlockers: Array.isArray(row.rft_blockers)
      ? (row.rft_blockers as RftShortfallItem[])
      : [],
  }
}


/**
 * One list, used by both reads. `@supabase/supabase-js` does not typecheck `.select()` strings
 * (see `construction-select-columns.test.ts`), so a second copy of this list is a second place
 * for a column name to rot unnoticed.
 */
const READINESS_COLUMNS =
  "spool_revision_id, project_id, iso_number, spool_number, revision_number, revision_status, material_line_total, material_line_checked, material_checked_on, field_weld_total, field_weld_complete, last_field_weld_on, field_support_total, field_support_recorded, last_field_support_on, to_site_on, erected_on, welded_bolted_on, supported_on, nde_pending, pwht_pending, is_rft, rft_on, rft_blockers"

/** One spool, read from the live view, or null when the id is not an accepted spool of the caller. */
export async function loadErectionReadiness(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<ErectionReadiness | null> {
  const { data, error } = await client
    .from("spool_erection_readiness")
    .select(READINESS_COLUMNS)
    .eq("spool_revision_id", spoolRevisionId)
    .maybeSingle()
  fail(error)
  return data ? toErectionReadiness(data) : null
}

// Field spool list -----------------------------------------------------------

export type ErectionSpoolSort = {
  id: "spoolNumber" | "isoNumber" | "ndePending" | "pwhtPending" | "isRft"
  desc: boolean
}

export interface ErectionSpoolQuery {
  search: string
  spoolNumber: string | null
  isoNumber: string | null
  /** A spool handed over in the address narrows the list to itself. */
  spoolRevisionId: string | null
  /** `null` among the stages is "not started". */
  stages: Array<ErectionStage | null> | null
  ndePending: NumberRange | null
  pwhtPending: NumberRange | null
  toSiteOn: DateRange | null
  isRft: boolean | null
  sort: ErectionSpoolSort | null
}

export interface ErectionSpoolCursor extends IsoCursor {
  /** Present only when the page is ordered by a single non-default server field. */
  sort?: { id: ErectionSpoolSort["id"]; value: string | number | boolean; desc: boolean }
}

export interface ErectionSpoolPage {
  rows: ErectionReadiness[]
  nextCursor: ErectionSpoolCursor | null
  /** All rows matching the query, not just the loaded cursor page. */
  totalCount: number
}

export type ErectionSpoolStageFacet = { stage: ErectionStage | null; count: number }

/**
 * The list reads the projection the fabrication list reads. Its field columns carry the same
 * names as the readiness view, except the two open-evidence counters, which the projection keeps
 * as `field_nde_pending` and `field_pwht_pending` beside the shop's own.
 */
const ERECTION_SPOOL_SELECT =
  "spool_revision_id, project_id, iso_number, spool_number, revision_number, revision_status, material_line_total, material_line_checked, material_checked_on, field_weld_total, field_weld_complete, last_field_weld_on, field_support_total, field_support_recorded, last_field_support_on, to_site_on, erected_on, welded_bolted_on, supported_on, field_nde_pending, field_pwht_pending, is_rft, rft_on, rft_blockers"

const ERECTION_SPOOL_SORT_COLUMNS = {
  spoolNumber: "spool_number",
  isoNumber: "iso_number",
  ndePending: "field_nde_pending",
  pwhtPending: "field_pwht_pending",
  isRft: "is_rft",
} as const

export const emptyErectionSpoolQuery = (): ErectionSpoolQuery => ({
  search: "",
  spoolNumber: null,
  isoNumber: null,
  spoolRevisionId: null,
  stages: null,
  ndePending: null,
  pwhtPending: null,
  toSiteOn: null,
  isRft: null,
  sort: null,
})

export const toErectionSpool = (row: Row): ErectionReadiness =>
  toErectionReadiness({ ...row, nde_pending: row.field_nde_pending, pwht_pending: row.field_pwht_pending })

const erectionSortValue = (spool: ErectionReadiness, id: ErectionSpoolSort["id"]): string | number | boolean => {
  switch (id) {
    case "spoolNumber": return spool.spoolNumber
    case "isoNumber": return spool.isoNumber
    case "ndePending": return spool.ndePending
    case "pwhtPending": return spool.pwhtPending
    case "isRft": return spool.isRft
  }
}

export function toErectionSpoolCursor(
  spool: ErectionReadiness,
  sort: ErectionSpoolSort | null = null,
): ErectionSpoolCursor {
  const cursor: ErectionSpoolCursor = {
    isoNumber: spool.isoNumber,
    spoolNumber: spool.spoolNumber,
    spoolRevisionId: spool.spoolRevisionId,
  }
  // ISO ascending is the list's natural key; any other order carries the value the database compares.
  if (sort && !(sort.id === "isoNumber" && !sort.desc)) {
    cursor.sort = { id: sort.id, value: erectionSortValue(spool, sort.id), desc: sort.desc }
  }
  return cursor
}

const applyErectionSpoolFilters = <Request extends ProjectionRequest>(
  initial: Request,
  filters: ErectionSpoolQuery,
): Request => {
  let request = applySpoolSearch(initial, filters.search)
  request = applyContains(request, "spool_number", filters.spoolNumber)
  request = applyContains(request, "iso_number", filters.isoNumber)
  if (filters.spoolRevisionId) request = request.eq("spool_revision_id", filters.spoolRevisionId) as Request
  request = applyStages(request, "current_erection_stage", filters.stages)
  request = applyNumberRange(request, "field_nde_pending", filters.ndePending)
  request = applyNumberRange(request, "field_pwht_pending", filters.pwhtPending)
  request = applyDateRange(request, "to_site_on", filters.toSiteOn)
  return applyBoolean(request, "is_rft", filters.isRft)
}

const applyErectionSpoolCursor = <Request extends ProjectionRequest>(
  initial: Request,
  cursor: ErectionSpoolCursor | null,
  sort: ErectionSpoolSort | null,
): Request => {
  if (!cursor) return initial
  if (!sort || sort.id === "isoNumber") return applyIsoKeyset(initial, cursor, sort?.desc ?? false)
  const sorted = cursor.sort
  if (!sorted || sorted.id !== sort.id || sorted.desc !== sort.desc) return initial
  return applyColumnKeyset(initial, ERECTION_SPOOL_SORT_COLUMNS[sort.id], sorted.value, cursor.spoolRevisionId, sort.desc)
}

/** One keyset page of the project's field spools and the size of the whole filtered result. */
export async function loadErectionSpoolPage(
  client: SupabaseClient<Database>,
  projectId: string,
  cursor: ErectionSpoolCursor | null = null,
  filters: ErectionSpoolQuery = emptyErectionSpoolQuery(),
  pageLimit = 50,
): Promise<ErectionSpoolPage> {
  const sort = filters.sort
  const base = () =>
    client
      .from("fabrication_spool_projections")
      .select(ERECTION_SPOOL_SELECT)
      .eq("project_id", projectId)
      .eq("revision_status", "accepted")
      .eq("is_removed", false)
  const countRequest = applyErectionSpoolFilters(
    client
      .from("fabrication_spool_projections")
      .select("spool_revision_id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("revision_status", "accepted")
      .eq("is_removed", false),
    filters,
  )
  let request = applyErectionSpoolCursor(applyErectionSpoolFilters(base(), filters), cursor, sort)

  if (!sort || sort.id === "isoNumber") {
    const ascending = !sort?.desc
    request = request
      .order("iso_number", { ascending })
      .order("spool_number", { ascending })
      .order("spool_revision_id", { ascending })
  } else {
    request = request
      .order(ERECTION_SPOOL_SORT_COLUMNS[sort.id], { ascending: !sort.desc })
      .order("spool_revision_id", { ascending: !sort.desc })
  }

  const [countResult, pageResult] = await Promise.all([countRequest, request.limit(pageLimit + 1)])
  fail(countResult.error)
  fail(pageResult.error)
  const data = pageResult.data ?? []
  const rows = data.slice(0, pageLimit).map(toErectionSpool)
  return {
    rows,
    nextCursor: data.length > pageLimit ? toErectionSpoolCursor(rows.at(-1)!, sort) : null,
    totalCount: countResult.count ?? 0,
  }
}

/**
 * The stage picker is a project-wide catalog: independent of the loaded page and of the current
 * query, in the order of the field sequence. RLS still limits it to what the caller may see.
 */
export async function loadErectionSpoolStageFacets(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<ErectionSpoolStageFacet[]> {
  const stages: Array<ErectionStage | null> = [null, ...ERECTION_STAGES]
  return Promise.all(stages.map(async (stage) => {
    let request = client
      .from("fabrication_spool_projections")
      .select("spool_revision_id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("revision_status", "accepted")
      .eq("is_removed", false)
    request = stage === null ? request.is("current_erection_stage", null) : request.eq("current_erection_stage", stage)
    const { count, error } = await request
    fail(error)
    return { stage, count: count ?? 0 }
  }))
}

export async function loadErectionChartData(client: SupabaseClient<Database>, projectId: string): Promise<ErectionChartData> {
  const [curve, stages, blockers] = await Promise.all([
    client.rpc("erection_progress_s_curve", { target_project_id: projectId }),
    client.rpc("erection_stage_distribution", { target_project_id: projectId }),
    client.rpc("erection_rft_blocker_distribution", { target_project_id: projectId }),
  ])
  fail(curve.error); fail(stages.error); fail(blockers.error)
  return { curve: curve.data ?? [], stages: stages.data ?? [], blockers: blockers.data ?? [] }
}

export async function recordErectionProgress(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  stage: Exclude<ErectionStage, "rft">,
  occurredOn: string,
  idempotencyKey: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await client.rpc("record_erection_progress", {
    target_spool_revision_id: spoolRevisionId,
    target_stage: stage,
    target_occurred_on: occurredOn,
    target_payload: payload as Json,
    target_idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordFieldMaterialCheck(
  client: SupabaseClient<Database>,
  payload: MaterialCheckPayload,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_field_material_check", {
    target_spool_revision_id: payload.target_spool_revision_id,
    target_checked_on: payload.checked_on,
    target_items: payload.items,
    target_qc13_form_id: payload.qc13_form_id ?? undefined,
    target_idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordFieldSupportProgress(
  client: SupabaseClient<Database>,
  supportRevisionId: string,
  installedOn: string,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_field_support_progress", {
    target_support_revision_id: supportRevisionId,
    installed_on: installedOn,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordFieldWeldProgress(
  client: SupabaseClient<Database>,
  payload: WeldProgressPayload,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_weld_progress", {
    target_phase: "erection",
    target_weld_joint_revision_id: payload.target_weld_joint_revision_id,
    subcontractor_id: payload.subcontractor_id,
    welding_procedure_id: payload.welding_procedure_id,
    points: payload.points,
    dates: payload.dates,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

// Field joints and field supports have no erection-specific read. `loadFieldWelds` and
// `loadFieldSupports` used to live here as copies of `loadWeldSummaries` and `loadSupports`
// from the construction repository; the screens now call those directly.
// `loadWeldSummaries(client, spoolRevisionId, "field")` also returns the diameter, thickness,
// WPS and lock state that the weld form needs and the removed copy did not select.
