import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"
import type { ConstructionStage, StageDates } from "../domain/construction-phase"
import type { NdtMethod } from "../domain/nde-obligation"
import type { FabricationReadiness, ReleaseBlocker } from "../domain/quality-release"
import type { WelderQualification, WeldingProcedure } from "../domain/weld-progress"
import type { MaterialCheckPayload } from "../application/record-material-check"
import type { WeldProgressPayload } from "../application/record-weld-progress"
import {
  applyBoolean,
  applyColumnKeyset,
  applyContains,
  applyIsoKeyset,
  applyNumberRange,
  applySpoolSearch,
  applyStages,
  type ProjectionRequest,
} from "./projection-keyset"
import { mapSupabaseConstructionError } from "./supabase-construction-errors"


type Row = Record<string, any>

const fail = (error: { code?: string; message?: string } | null): void => {
  if (error) throw new Error(mapSupabaseConstructionError(error))
}

const required = <T>(data: T | null | undefined): T => {
  if (data === null || data === undefined) throw new Error(mapSupabaseConstructionError(null))
  return data
}

const toNumber = (value: unknown): number | null =>
  value === null || value === undefined || value === "" ? null : Number(value)

export interface SpoolStatus {
  spoolRevisionId: string
  projectId: string
  isoNumber: string
  spoolNumber: string
  revisionNumber: string
  pdsAreaId: string | null
  currentStage: ConstructionStage | null
  dates: StageDates
  isFabricated: boolean
  isReleasable: boolean
  lineTotal: number
  lineChecked: number
  weldTotal: number
  weldComplete: number
  supportTotal: number
  supportRecorded: number
  ndePending: number
  pwhtPending: number
}

export interface FabricationSpoolCursor {
  isoNumber: string
  spoolNumber: string
  spoolRevisionId: string
  /** Present only when the page is ordered by a single non-default server field. */
  sort?: {
    id: FabricationSpoolSort["id"]
    value: string | number | boolean
    desc: boolean
  }
}

export interface FabricationSpoolPage {
  rows: SpoolStatus[]
  nextCursor: FabricationSpoolCursor | null
  /** All rows matching the query, not just the loaded cursor page. */
  totalCount: number
}

export type FabricationSpoolSort = {
  id: "spoolNumber" | "isoNumber" | "ndePending" | "pwhtPending" | "isReleasable"
  desc: boolean
}

export interface FabricationSpoolQuery {
  search: string
  spoolNumber: string | null
  isoNumber: string | null
  stages: Array<ConstructionStage | null> | null
  ndePending: { min: number | null; max: number | null } | null
  pwhtPending: { min: number | null; max: number | null } | null
  isReleasable: boolean | null
  sort: FabricationSpoolSort | null
}

export type FabricationSpoolStageFacet = {
  stage: ConstructionStage | null
  count: number
}

export interface FabricationChartData {
  curve: Database["public"]["Functions"]["fabrication_progress_s_curve"]["Returns"]
  stages: Database["public"]["Functions"]["fabrication_stage_distribution"]["Returns"]
  pdsAreas: Database["public"]["Functions"]["fabrication_progress_by_pds_area"]["Returns"]
}

export function toSpoolStatus(row: Row): SpoolStatus {
  return {
    spoolRevisionId: row.spool_revision_id,
    projectId: row.project_id,
    isoNumber: row.iso_number,
    spoolNumber: row.spool_number,
    revisionNumber: row.revision_number,
    pdsAreaId: row.pds_area_id ?? null,
    currentStage: (row.current_stage as ConstructionStage | null) ?? null,
    dates: {
      start_fab: row.start_fab_on ?? null,
      material_check: row.material_check_on ?? null,
      fabricated: row.fabricated_on ?? null,
      qc_release: row.qc_release_on ?? null,
      sent_to_paint: row.sent_to_paint_on ?? null,
      painted: row.painted_on ?? null,
      final_qc: row.final_qc_on ?? null,
      laydown: row.laydown_on ?? null,
    },
    isFabricated: row.is_fabricated === true,
    isReleasable: row.is_releasable === true,
    lineTotal: row.line_total ?? 0,
    lineChecked: row.line_checked ?? 0,
    weldTotal: row.weld_total ?? 0,
    weldComplete: row.weld_complete ?? 0,
    supportTotal: row.support_total ?? 0,
    supportRecorded: row.support_recorded ?? 0,
    ndePending: row.nde_pending ?? 0,
    pwhtPending: row.pwht_pending ?? 0,
  }
}

export function toFabricationSpoolCursor(
  status: SpoolStatus,
  sort: FabricationSpoolSort | null = null,
): FabricationSpoolCursor {
  const cursor: FabricationSpoolCursor = {
    isoNumber: status.isoNumber,
    spoolNumber: status.spoolNumber,
    spoolRevisionId: status.spoolRevisionId,
  }
  // ISO ascending is the list's natural key, so its three-field cursor remains the compact,
  // backwards-compatible form. Other orders carry precisely the value that the database compares.
  if (sort && !(sort.id === "isoNumber" && !sort.desc)) {
    cursor.sort = {
      id: sort.id,
      value: spoolSortValue(status, sort.id),
      desc: sort.desc,
    }
  }
  return cursor
}

export interface WeldSummary {
  weldJointRevisionId: string
  spoolRevisionId: string
  weldNumber: string
  spoolNumber: string
  weldLocation: string
  diameterInch: number | null
  thicknessMm: number | null
  wpsCode: string | null
  welders: string[]
  weldOn: string | null
  isLocked: boolean
  obligationTotal: number
  obligationPending: number
  pwhtRequired: boolean
  pwhtAccepted: boolean
}

export function toWeldSummary(row: Row): WeldSummary {
  return {
    weldJointRevisionId: row.weld_joint_revision_id,
    spoolRevisionId: row.spool_revision_id,
    weldNumber: row.weld_number,
    spoolNumber: row.spool_number,
    weldLocation: row.weld_location,
    diameterInch: toNumber(row.diameter_inch),
    thicknessMm: toNumber(row.thickness_mm),
    wpsCode: row.wps_code ?? null,
    welders: row.welders ?? [],
    weldOn: row.weld_on ?? null,
    isLocked: row.is_locked === true,
    obligationTotal: row.obligation_total ?? 0,
    obligationPending: row.obligation_pending ?? 0,
    pwhtRequired: row.pwht_required === true,
    pwhtAccepted: row.pwht_accepted === true,
  }
}


export function toWeldingProcedure(row: Row): WeldingProcedure {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    subcontractorId: row.subcontractor_id ?? null,
    materialTypeId: row.material_type_id,
    diameterFrom: Number(row.diameter_from),
    diameterTo: Number(row.diameter_to),
    thicknessFrom: Number(row.thickness_from),
    thicknessTo: Number(row.thickness_to),
    approvedOn: row.approved_on,
  }
}

export function toWelderQualification(row: Row): WelderQualification {
  return {
    id: row.id,
    welderCode: row.welder_code,
    status: row.status,
    subcontractorId: row.subcontractor_id,
    expiresOn: row.expires_on,
    wpsIds: (row.welder_wps_qualifications ?? []).map((link: Row) => link.wps_id),
  }
}

export function toReadiness(row: Row): FabricationReadiness {
  return {
    lineTotal: row.line_total ?? 0,
    lineChecked: row.line_checked ?? 0,
    weldTotal: row.weld_total ?? 0,
    weldComplete: row.weld_complete ?? 0,
    supportTotal: row.support_total ?? 0,
    supportRecorded: row.support_recorded ?? 0,
    ndePending: row.nde_pending ?? 0,
    pwhtPending: row.pwht_pending ?? 0,
    revisionStatus: row.revision_status ?? "accepted",
    isFabricated: row.is_fabricated === true,
    isReleasable: row.is_releasable === true,
    releaseBlockers: Array.isArray(row.release_blockers)
      ? (row.release_blockers as ReleaseBlocker[])
      : [],
  }
}


export interface ObligationRow {
  id: string
  weldJointRevisionId: string
  weldNumber: string
  method: NdtMethod
  requiredCoverage: number
  selectionMode: string
  disposition: string
  cycleKind: string
  cycleOrdinal: number
}

export interface PwhtRow {
  id: string
  weldJointRevisionId: string
  weldNumber: string
  thresholdMm: number | null
  acceptedOn: string | null
}

export interface PaintOption {
  lineServiceId: string
  lineServiceCode: string
  ralCode: string
  requiredFinalDftMicrons: number
  intermediateCoatCount: number
  finalCoatCount: number
}

export interface LocationOption {
  id: string
  code: string
  description: string | null
}

export interface SupportRow {
  supportRevisionId: string
  supportNumber: string
  supportType: string | null
  quantity: number
  installedOn: string | null
  /**
   * Which phase recorded the installation. `support_progress_records` upserts on
   * `support_revision_id`, so a support carries one record: a support installed in the shop
   * shows here as `fabrication` and is counted out of `field_support_recorded`.
   */
  installedPhase: string | null
}

export interface WeldFormReferentials {
  subcontractors: { id: string; code: string; name: string }[]
  procedures: WeldingProcedure[]
  welders: WelderQualification[]
  reworkCodes: { id: string; code: string; description: string }[]
}

// Reads -----------------------------------------------------------------------

const FABRICATION_SPOOL_SELECT = [
  "spool_revision_id",
  "project_id",
  "iso_number",
  "spool_number",
  "revision_number",
  "pds_area_id",
  "current_stage",
  "start_fab_on",
  "material_check_on",
  "fabricated_on",
  "qc_release_on",
  "sent_to_paint_on",
  "painted_on",
  "final_qc_on",
  "laydown_on",
  "is_fabricated",
  "is_releasable",
  "line_total",
  "line_checked",
  "weld_total",
  "weld_complete",
  "support_total",
  "support_recorded",
  "nde_pending",
  "pwht_pending",
].join(",")

const FABRICATION_SPOOL_SORT_COLUMNS = {
  spoolNumber: "spool_number",
  isoNumber: "iso_number",
  ndePending: "nde_pending",
  pwhtPending: "pwht_pending",
  isReleasable: "is_releasable",
} as const

const emptyFabricationSpoolQuery = (): FabricationSpoolQuery => ({
  search: "",
  spoolNumber: null,
  isoNumber: null,
  stages: null,
  ndePending: null,
  pwhtPending: null,
  isReleasable: null,
  sort: null,
})

const spoolSortValue = (
  status: SpoolStatus,
  id: FabricationSpoolSort["id"],
): string | number | boolean => {
  switch (id) {
    case "spoolNumber": return status.spoolNumber
    case "isoNumber": return status.isoNumber
    case "ndePending": return status.ndePending
    case "pwhtPending": return status.pwhtPending
    case "isReleasable": return status.isReleasable
  }
}


const applyFabricationSpoolFilters = <Request extends ProjectionRequest>(
  initial: Request,
  filters: FabricationSpoolQuery,
): Request => {
  let request = applySpoolSearch(initial, filters.search)
  request = applyContains(request, "spool_number", filters.spoolNumber)
  request = applyContains(request, "iso_number", filters.isoNumber)
  request = applyStages(request, "current_stage", filters.stages)
  request = applyNumberRange(request, "nde_pending", filters.ndePending)
  request = applyNumberRange(request, "pwht_pending", filters.pwhtPending)
  return applyBoolean(request, "is_releasable", filters.isReleasable)
}

const applyFabricationSpoolCursor = <Request extends ProjectionRequest>(
  initial: Request,
  cursor: FabricationSpoolCursor | null,
  sort: FabricationSpoolSort | null,
): Request => {
  if (!cursor) return initial
  if (!sort || sort.id === "isoNumber") return applyIsoKeyset(initial, cursor, sort?.desc ?? false)
  const sorted = cursor.sort
  if (!sorted || sorted.id !== sort.id || sorted.desc !== sort.desc) return initial
  return applyColumnKeyset(initial, FABRICATION_SPOOL_SORT_COLUMNS[sort.id], sorted.value, cursor.spoolRevisionId, sort.desc)
}

// The projection stores only accepted, non-removed revisions. That keeps every fabrication
// picker on the record it can act on and avoids duplicate spool labels after an ISO revision.
export async function loadSpoolStatuses(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<SpoolStatus[]> {
  return (await loadFabricationSpoolPage(client, projectId)).rows
}

export async function loadFabricationSpoolPage(
  client: SupabaseClient<Database>,
  projectId: string,
  cursor: FabricationSpoolCursor | null = null,
  filters: FabricationSpoolQuery = emptyFabricationSpoolQuery(),
  pageLimit = 50,
): Promise<FabricationSpoolPage> {
  const sort = filters.sort
  let countRequest = client
    .from("fabrication_spool_projections")
    .select("spool_revision_id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("revision_status", "accepted")
    .eq("is_removed", false)
  let request = client
    .from("fabrication_spool_projections")
    .select(FABRICATION_SPOOL_SELECT)
    .eq("project_id", projectId)
    .eq("revision_status", "accepted")
    .eq("is_removed", false)

  countRequest = applyFabricationSpoolFilters(countRequest, filters)
  request = applyFabricationSpoolFilters(request, filters)
  request = applyFabricationSpoolCursor(request, cursor, sort)

  if (!sort || sort.id === "isoNumber") {
    request = request
      .order("iso_number", { ascending: !sort?.desc })
      .order("spool_number", { ascending: !sort?.desc })
      .order("spool_revision_id", { ascending: !sort?.desc })
  } else {
    request = request
      .order(FABRICATION_SPOOL_SORT_COLUMNS[sort.id], { ascending: !sort.desc })
      .order("spool_revision_id", { ascending: !sort.desc })
  }

  const [countResult, pageResult] = await Promise.all([
    countRequest,
    request.limit(pageLimit + 1),
  ])
  fail(countResult.error)
  const { data, error } = pageResult
  fail(error)
  const rows = (data ?? []).slice(0, pageLimit).map(toSpoolStatus)
  return {
    rows,
    nextCursor: (data ?? []).length > pageLimit ? toFabricationSpoolCursor(rows.at(-1)!, sort) : null,
    totalCount: countResult.count ?? 0,
  }
}

/**
 * The stage picker is a project-wide catalog: it is independent of the loaded cursor page and of
 * the current table query. RLS still limits it to the spools the operator is allowed to see.
 */
export async function loadFabricationSpoolStageFacets(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<FabricationSpoolStageFacet[]> {
  const stages: Array<ConstructionStage | null> = [null, "start_fab", "material_check", "fabricated", "qc_release", "sent_to_paint", "painted", "final_qc", "laydown"]

  return Promise.all(stages.map(async (stage) => {
    let request = client
      .from("fabrication_spool_projections")
      .select("spool_revision_id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("revision_status", "accepted")
      .eq("is_removed", false)
    request = stage === null ? request.is("current_stage", null) : request.eq("current_stage", stage)
    const { count, error } = await request
    fail(error)
    return { stage, count: count ?? 0 }
  }))
}

export async function loadFabricationSpoolStageCounts(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<Map<string, number>> {
  const { data, error } = await client.rpc("fabrication_spool_stage_counts", {
    target_project_id: projectId,
  })
  fail(error)
  return new Map(
    (data ?? []).map((row) => [row.current_stage, Number(row.spool_count)]),
  )
}

export async function loadFabricationChartData(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<FabricationChartData> {
  const [curve, stages, pdsAreas] = await Promise.all([
    client.rpc("fabrication_progress_s_curve", { target_project_id: projectId }),
    client.rpc("fabrication_stage_distribution", { target_project_id: projectId }),
    client.rpc("fabrication_progress_by_pds_area", { target_project_id: projectId }),
  ])
  fail(curve.error)
  fail(stages.error)
  fail(pdsAreas.error)
  return {
    curve: curve.data ?? [],
    stages: stages.data ?? [],
    pdsAreas: pdsAreas.data ?? [],
  }
}

export async function loadSpoolStatus(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<SpoolStatus> {
  const { data, error } = await client
    .rpc("get_fabrication_spool", { target_spool_revision_id: spoolRevisionId })
    .single()
  fail(error)
  return toSpoolStatus(required(data))
}

export async function loadReadiness(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<FabricationReadiness> {
  const { data, error } = await client
    .rpc("get_fabrication_spool", { target_spool_revision_id: spoolRevisionId })
    .single()
  fail(error)
  return toReadiness(required(data))
}





/**
 * `weldLocation` narrows the joints to one phase's work — `field` for the erection screens,
 * omitted for fabrication, which shows every joint on the spool and badges the ones that are
 * not shop work.
 */
export async function loadWeldSummaries(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  weldLocation?: string,
): Promise<WeldSummary[]> {
  let query = client
    .from("weld_progress_summary")
    .select("*")
    .eq("spool_revision_id", spoolRevisionId)
  if (weldLocation) query = query.eq("weld_location", weldLocation)
  const { data, error } = await query.order("weld_number")
  fail(error)
  return (data ?? []).map(toWeldSummary)
}

export async function loadWeldFormReferentials(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<WeldFormReferentials> {
  const [subcontractors, procedures, welders, reworkCodes] = await Promise.all([
    client
      .from("project_subcontractors")
      .select("id, code, description")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("code"),
    client
      .from("project_welding_procedures")
      .select("id, code, status, subcontractor_id, material_type_id, diameter_from, diameter_to, thickness_from, thickness_to, approved_on")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("code"),
    client
      .from("welder_qualifications")
      .select("id, welder_code, status, subcontractor_id, expires_on, welder_wps_qualifications(wps_id)")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("welder_code"),
    client
      .from("project_rework_codes")
      .select("id, code, description")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("code"),
  ])

  fail(subcontractors.error)
  fail(procedures.error)
  fail(welders.error)
  fail(reworkCodes.error)

  return {
    subcontractors: (subcontractors.data ?? []).map((sub: Row) => ({
      id: sub.id,
      code: sub.code,
      name: sub.description ?? sub.code,
    })),
    procedures: (procedures.data ?? []).map(toWeldingProcedure),
    welders: (welders.data ?? []).map(toWelderQualification),
    reworkCodes: (reworkCodes.data ?? []) as WeldFormReferentials["reworkCodes"],
  }
}

export interface AreaSubcontractors {
  shopSubcontractorId: string | null
  fieldSubcontractorId: string | null
}

/** The shop and field subcontractor of the PDS area the spool's isometric belongs to (manual 3.4). */
export async function loadAreaSubcontractors(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<AreaSubcontractors | null> {
  const { data, error } = await client
    .from("spool_revisions")
    .select("isometric_revisions(project_pds_areas(shop_subcontractor_id, field_subcontractor_id))")
    .eq("id", spoolRevisionId)
    .maybeSingle()
  fail(error)
  const area = (data as Row | null)?.isometric_revisions?.project_pds_areas
  if (!area) return null
  return {
    shopSubcontractorId: area.shop_subcontractor_id ?? null,
    fieldSubcontractorId: area.field_subcontractor_id ?? null,
  }
}

export async function loadObligations(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<ObligationRow[]> {
  const { data, error } = await client
    .from("nde_obligations")
    .select("id, weld_joint_revision_id, method, required_coverage, selection_mode, disposition, cycle_kind, cycle_ordinal, weld_joint_revisions(weld_joints(weld_number))")
    .eq("spool_revision_id", spoolRevisionId)
    .order("method")
  fail(error)
  return (data ?? []).map((row: Row) => ({
    id: row.id,
    weldJointRevisionId: row.weld_joint_revision_id,
    weldNumber: row.weld_joint_revisions?.weld_joints?.weld_number ?? "",
    method: row.method as NdtMethod,
    requiredCoverage: Number(row.required_coverage),
    selectionMode: row.selection_mode,
    disposition: row.disposition,
    cycleKind: row.cycle_kind ?? "original",
    cycleOrdinal: Number(row.cycle_ordinal ?? 0),
  }))
}

export async function loadPwhtRequirements(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<PwhtRow[]> {
  const { data, error } = await client
    .from("pwht_requirements")
    .select("id, weld_joint_revision_id, thickness_threshold_mm, weld_joint_revisions(weld_joints(weld_number)), pwht_results(outcome, performed_on)")
    .eq("spool_revision_id", spoolRevisionId)
  fail(error)
  return (data ?? []).map((row: Row) => ({
    id: row.id,
    weldJointRevisionId: row.weld_joint_revision_id,
    weldNumber: row.weld_joint_revisions?.weld_joints?.weld_number ?? "",
    thresholdMm: toNumber(row.thickness_threshold_mm),
    acceptedOn:
      (row.pwht_results ?? []).find((result: Row) => result.outcome === "accepted")
        ?.performed_on ?? null,
  }))
}

export function toSupportRow(row: Row): SupportRow {
  return {
    supportRevisionId: row.id,
    supportNumber: row.supports?.support_number ?? "",
    supportType: row.support_type ?? null,
    quantity: row.quantity ?? 1,
    // support_progress_records.support_revision_id is unique, so PostgREST embeds it as a to-one
    // object (or null) — not an array. Indexing [0] here always yielded undefined.
    installedOn: row.support_progress_records?.installed_on ?? null,
    installedPhase: row.support_progress_records?.phase ?? null,
  }
}

export async function loadSupports(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<SupportRow[]> {
  const { data, error } = await client
    .from("support_revisions")
    .select(
      "id, support_type, quantity, supports(support_number), support_progress_records(installed_on, phase)",
    )
    .eq("spool_revision_id", spoolRevisionId)
    .eq("is_removed", false)
  fail(error)
  return (data ?? []).map(toSupportRow)
}

export async function loadPaintOptions(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<PaintOption[]> {
  const { data, error } = await client
    .from("project_paint_matrix_rules")
    .select("line_service_id, required_final_dft_microns, intermediate_coat_count, final_coat_count, project_line_services(code), project_ral_codes(ral_code)")
    .eq("project_id", projectId)
    .eq("status", "active")
  fail(error)
  return (data ?? []).map((row: Row) => ({
    lineServiceId: row.line_service_id,
    lineServiceCode: row.project_line_services?.code ?? "",
    ralCode: row.project_ral_codes?.ral_code ?? "",
    requiredFinalDftMicrons: Number(row.required_final_dft_microns),
    intermediateCoatCount: row.intermediate_coat_count ?? 0,
    finalCoatCount: row.final_coat_count ?? 0,
  }))
}

export async function loadLocations(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<LocationOption[]> {
  const { data, error } = await client
    .from("project_locations")
    .select("id, code, description")
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("code")
  fail(error)
  return (data ?? []) as LocationOption[]
}

// Commands ---------------------------------------------------------------------

export async function recordConstructionProgress(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  stage: "start_fab" | "sent_to_paint",
  occurredOn: string,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_construction_progress", {
    target_spool_revision_id: spoolRevisionId,
    target_phase: "fabrication",
    target_stage: stage,
    target_occurred_on: occurredOn,
    target_idempotency_key: idempotencyKey,
  })
  fail(error)
}

/**
 * Corrects a recorded Start Fab or Sent to Paint date. The server compensates the event that stands and
 * records the new date with the reason; nothing is rewritten.
 */
export async function correctConstructionProgress(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  stage: "start_fab" | "sent_to_paint",
  occurredOn: string,
  reason: string,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("correct_construction_progress", {
    target_spool_revision_id: spoolRevisionId,
    target_phase: "fabrication",
    target_stage: stage,
    new_occurred_on: occurredOn,
    correction_reason: reason,
    target_idempotency_key: idempotencyKey,
  })
  fail(error)
}

export interface Qc13Form {
  id: string
  formNumber: string
}

export async function requestQc13Form(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  issuedOn: string,
  idempotencyKey: string,
): Promise<Qc13Form> {
  const { data, error } = await client.rpc("request_qc13_form", {
    target_spool_revision_id: spoolRevisionId,
    requested_date: issuedOn,
    target_idempotency_key: idempotencyKey,
  })
  fail(error)
  const row = required(data) as Row
  return { id: row.id, formNumber: row.form_number }
}

/** The most recent QC-13 for a spool, so a reload does not lose the evidence link. */
export async function loadLatestQc13Form(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<Qc13Form | null> {
  const { data, error } = await client
    .from("qc13_progress_forms")
    .select("id, form_number")
    .eq("spool_revision_id", spoolRevisionId)
    .order("requested_on", { ascending: false })
    .limit(1)
  fail(error)
  const row = (data ?? [])[0] as Row | undefined
  return row ? { id: row.id, formNumber: row.form_number } : null
}

export async function materializeProgressCopies(
  client: SupabaseClient<Database>,
  isometricRevisionId: string,
): Promise<number> {
  const { data, error } = await client.rpc("materialize_progress_copies", {
    target_isometric_revision_id: isometricRevisionId,
  })
  fail(error)
  return Number(data ?? 0)
}

export async function recordMaterialCheck(
  client: SupabaseClient<Database>,
  payload: MaterialCheckPayload,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_material_check", {
    target_spool_revision_id: payload.target_spool_revision_id,
    target_checked_on: payload.checked_on,
    target_items: payload.items,
    target_qc13_form_id: payload.qc13_form_id ?? undefined,
    target_idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordWeldProgress(
  client: SupabaseClient<Database>,
  payload: WeldProgressPayload,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_weld_progress", {
    target_weld_joint_revision_id: payload.target_weld_joint_revision_id,
    subcontractor_id: payload.subcontractor_id,
    welding_procedure_id: payload.welding_procedure_id,
    points: payload.points,
    dates: payload.dates,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function correctWeldProgress(
  client: SupabaseClient<Database>,
  weldJointRevisionId: string,
  expectedVersion: number,
  corrections: Record<string, string>,
  reason: string,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("correct_weld_progress", {
    target_weld_joint_revision_id: weldJointRevisionId,
    expected_version: expectedVersion,
    corrections,
    reason,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordSupportProgress(
  client: SupabaseClient<Database>,
  supportRevisionId: string,
  installedOn: string,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_support_progress", {
    target_support_revision_id: supportRevisionId,
    installed_on: installedOn,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordPwhtResult(
  client: SupabaseClient<Database>,
  requirementId: string,
  chartNumber: string,
  performedOn: string,
  outcome: "accepted" | "rejected",
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_pwht_result", {
    target_requirement_id: requirementId,
    chart_number: chartNumber,
    performed_on: performedOn,
    outcome,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function releaseQualityRecord(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  releasedOn: string,
  comment: string | null,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("release_quality_record", {
    target_spool_revision_id: spoolRevisionId,
    released_on: releasedOn,
    comment: comment ?? undefined,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordPaintProgress(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  lineServiceId: string,
  details: Record<string, string | number>,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_paint_progress", {
    target_spool_revision_id: spoolRevisionId,
    line_service_id: lineServiceId,
    details,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordLaydown(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
  locationId: string,
  storedOn: string,
  idempotencyKey: string,
): Promise<void> {
  const { error } = await client.rpc("record_laydown", {
    target_spool_revision_id: spoolRevisionId,
    location_id: locationId,
    stored_on: storedOn,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}
