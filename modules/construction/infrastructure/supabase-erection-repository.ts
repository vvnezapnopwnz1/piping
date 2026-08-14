import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "@/lib/supabase/database.types"
import type { ErectionStage } from "../domain/erection-stage"
import type { MaterialCheckPayload } from "../application/record-material-check"
import type { WeldProgressPayload } from "../application/record-weld-progress"
import { mapSupabaseConstructionError } from "./supabase-construction-errors"

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
  }
}

/**
 * One list, used by both reads. `@supabase/supabase-js` does not typecheck `.select()` strings
 * (see `construction-select-columns.test.ts`), so a second copy of this list is a second place
 * for a column name to rot unnoticed.
 */
const READINESS_COLUMNS =
  "spool_revision_id, project_id, iso_number, spool_number, revision_number, revision_status, material_line_total, material_line_checked, material_checked_on, field_weld_total, field_weld_complete, last_field_weld_on, field_support_total, field_support_recorded, last_field_support_on, to_site_on, erected_on, welded_bolted_on, supported_on, nde_pending, pwht_pending, is_rft, rft_on"

export async function loadErectionReadiness(
  client: SupabaseClient<Database>,
  spoolRevisionId: string,
): Promise<ErectionReadiness> {
  const { data, error } = await client
    .from("spool_erection_readiness")
    .select(READINESS_COLUMNS)
    .eq("spool_revision_id", spoolRevisionId)
    .single()
  fail(error)
  if (!data) throw new Error(mapSupabaseConstructionError(null))
  return toErectionReadiness(data)
}

export async function loadErectionReadinessForProject(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<ErectionReadiness[]> {
  const { data, error } = await client
    .from("spool_erection_readiness")
    .select(READINESS_COLUMNS)
    .eq("project_id", projectId)
    .order("iso_number")
    .order("spool_number")
  fail(error)
  return (data ?? []).map((row) => toErectionReadiness(row))
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
