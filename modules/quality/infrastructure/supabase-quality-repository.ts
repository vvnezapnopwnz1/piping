import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type {
  CoverageRegime,
  NdeBatch,
  NdeObligation,
  NdeResult,
  NdeKpis,
  NdtMethod,
} from "../domain/nde-batch"
import { mapSupabaseQualityError } from "./supabase-quality-errors"

export type {
  CoverageRegime,
  NdeBatch,
  NdeObligation,
  NdeResult,
  NdeKpis,
  NdtMethod,
} from "../domain/nde-batch"

type Row = Record<string, unknown>

const fail = (error: { code?: string; message?: string } | null): void => {
  if (error) throw new Error(mapSupabaseQualityError(error))
}

const required = <T>(data: T | null | undefined): T => {
  if (data === null || data === undefined) throw new Error(mapSupabaseQualityError(null))
  return data
}

function toBatch(row: Row): NdeBatch {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    batchNumber: row.batch_number as string,
    method: row.method as NdtMethod,
    coverageRegime: row.coverage_regime as CoverageRegime,
    responsibleWelderQualificationId: (row.responsible_welder_qualification_id as string) ?? null,
    ndtSubcontractorId: (row.ndt_subcontractor_id as string) ?? null,
    status: row.status as NdeBatch["status"],
    issuedOn: (row.issued_on as string) ?? null,
    returnedOn: (row.returned_on as string) ?? null,
    closedOn: (row.closed_on as string) ?? null,
    reportNumber: (row.report_number as string) ?? null,
    createdAt: row.created_at as string,
    escalatedAt: (row.escalated_at as string) ?? null,
    escalationReason: (row.escalation_reason as NdeBatch["escalationReason"]) ?? null,
  }
}

export function toObligation(row: Row): NdeObligation {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    weldJointRevisionId: row.weld_joint_revision_id as string,
    spoolRevisionId: row.spool_revision_id as string,
    method: row.method as NdtMethod,
    requiredCoverage: row.required_coverage as number,
    selectionMode: row.selection_mode as string,
    coverageRegime: row.coverage_regime as CoverageRegime,
    disposition: row.disposition as NdeObligation["disposition"],
    cycleKind: row.cycle_kind as NdeObligation["cycleKind"],
    cycleOrdinal: row.cycle_ordinal as number,
    parentObligationId: (row.parent_obligation_id as string) ?? null,
    responsibleWelderQualificationId:
      (row.responsible_welder_qualification_id as string) ?? null,
    weldNumber:
      ((row.weld_joint_revisions as Row | null)?.weld_joints as Row | null)?.weld_number as string ??
      "",
    spoolNumber:
      ((row.spool_revisions as Row | null)?.spools as Row | null)?.spool_number as string ?? "",
    // nde_batch_items carries `unique (obligation_id)`, so an obligation belongs to at most one
    // batch and PostgREST embeds the join row as a to-one object.
    batchNumber:
      ((row.nde_batch_items as Row | null)?.nde_batches as Row | null)?.batch_number as string ??
      null,
  }
}

export async function loadNdeBatches(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<NdeBatch[]> {
  const { data, error } = await client
    .from("nde_batches")
    .select(
      "id, project_id, batch_number, method, coverage_regime, responsible_welder_qualification_id, ndt_subcontractor_id, status, issued_on, returned_on, closed_on, report_number, created_at, escalated_at, escalation_reason"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  fail(error)
  return required(data).map(toBatch)
}

export async function loadNdeObligations(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<NdeObligation[]> {
  const { data, error } = await client
    .from("nde_obligations")
    .select(
      "id, project_id, weld_joint_revision_id, spool_revision_id, method, required_coverage, selection_mode, coverage_regime, disposition, cycle_kind, cycle_ordinal, parent_obligation_id, responsible_welder_qualification_id, weld_joint_revisions(weld_joints(weld_number)), spool_revisions(spools(spool_number)), nde_batch_items(nde_batches(batch_number))"
    )
    .eq("project_id", projectId)
  fail(error)
  // Spool then joint, so a repair and its tracers read in the order an inspector walks
  // the line rather than in whatever order PostgREST returns them.
  return required(data)
    .map(toObligation)
    .sort(
      (left, right) =>
        left.spoolNumber.localeCompare(right.spoolNumber) ||
        left.weldNumber.localeCompare(right.weldNumber) ||
        left.cycleKind.localeCompare(right.cycleKind) ||
        left.cycleOrdinal - right.cycleOrdinal,
    )
}

export async function createNdeBatch(
  client: SupabaseClient<Database>,
  projectId: string,
  method: NdtMethod,
  coverageRegime: CoverageRegime,
  welderQualificationId: string | null,
  subcontractorId: string | null,
  idempotencyKey: string
): Promise<NdeBatch> {
  const { data, error } = await client.rpc("create_nde_batch", {
    target_project_id: projectId,
    method: method,
    coverage_regime: coverageRegime,
    welder_id: welderQualificationId ?? undefined,
    subcontractor_id: subcontractorId ?? undefined,
    idempotency_key: idempotencyKey,
  })
  fail(error)
  return toBatch(required(data) as Row)
}

/**
 * The obligation count per batch, keyed by batch id. A second small query rather than widening
 * `loadNdeBatches`, since `NdeBatch` is read elsewhere without needing the count.
 */
export async function loadNdeBatchObligationCounts(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<Record<string, number>> {
  const { data, error } = await client
    .from("nde_batch_items")
    .select("batch_id, nde_batches!inner(project_id)")
    .eq("nde_batches.project_id", projectId)
  fail(error)
  const counts: Record<string, number> = {}
  for (const row of required(data) as Row[]) {
    const batchId = row.batch_id as string
    counts[batchId] = (counts[batchId] ?? 0) + 1
  }
  return counts
}

/**
 * The candidate set `allocate_nde_batch_candidates` computes internally, read without committing
 * anything — so the operator can see which joints an allocation would take before taking them.
 */
export async function previewNdeBatchCandidates(
  client: SupabaseClient<Database>,
  batchId: string
): Promise<{ obligationId: string; weldNumber: string; weldedOn: string | null }[]> {
  const { data, error } = await client.rpc("nde_batch_candidates", { target_batch_id: batchId })
  fail(error)
  return (required(data) as Row[]).map((row) => ({
    obligationId: row.candidate_obligation_id as string,
    weldNumber: row.candidate_weld_number as string,
    weldedOn: (row.candidate_welded_on as string) ?? null,
  }))
}

/** Returns the number of candidates the RPC actually allocated. */
export async function allocateNdeBatchCandidates(
  client: SupabaseClient<Database>,
  batchId: string,
  targetPercentage: number,
  idempotencyKey: string
): Promise<number> {
  const { data, error } = await client.rpc("allocate_nde_batch_candidates", {
    target_batch_id: batchId,
    target_percentage: targetPercentage,
    idempotency_key: idempotencyKey,
  })
  fail(error)
  return (data as number) ?? 0
}

export async function issueNdeBatch(
  client: SupabaseClient<Database>,
  batchId: string,
  idempotencyKey: string
): Promise<void> {
  const { error } = await client.rpc("issue_nde_batch", {
    target_batch_id: batchId,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export async function recordNdeResult(
  client: SupabaseClient<Database>,
  obligationId: string,
  outcome: "accepted" | "rejected",
  examinedOn: string,
  reportNumber: string | null,
  defectReworkCodeId: string | null,
  responsibleWelderQualificationId: string | null,
  idempotencyKey: string
): Promise<NdeResult> {
  const { data, error } = await client.rpc("record_nde_result", {
    target_obligation_id: obligationId,
    outcome: outcome,
    examined_on: examinedOn,
    report_number: reportNumber ?? undefined,
    defect_rework_code_id: defectReworkCodeId ?? undefined,
    responsible_welder_qualification_id: responsibleWelderQualificationId ?? undefined,
    idempotency_key: idempotencyKey,
  })
  fail(error)
  const row = required(data) as Row
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    obligationId: row.obligation_id as string,
    batchItemId: (row.batch_item_id as string) ?? null,
    outcome: row.outcome as "accepted" | "rejected",
    examinedOn: row.examined_on as string,
    reportNumber: (row.report_number as string) ?? null,
    defectReworkCodeId: (row.defect_rework_code_id as string) ?? null,
    responsibleWelderQualificationId:
      (row.responsible_welder_qualification_id as string) ?? null,
    comment: (row.comment as string) ?? null,
  }
}

export async function closeNdeBatch(
  client: SupabaseClient<Database>,
  batchId: string,
  idempotencyKey: string
): Promise<void> {
  const { error } = await client.rpc("close_nde_batch", {
    target_batch_id: batchId,
    idempotency_key: idempotencyKey,
  })
  fail(error)
}

export interface QualityReferentials {
  welders: { id: string; welderCode: string; fullName: string | null }[]
  reworkCodes: { id: string; code: string; description: string | null }[]
}

export interface NdeChartData {
  outcomes: Database["public"]["Functions"]["nde_outcome_trend"]["Returns"]
  workflow: Database["public"]["Functions"]["nde_inspection_workflow_distribution"]["Returns"]
  methods: Database["public"]["Functions"]["nde_method_distribution"]["Returns"]
}

/**
 * Dashboard aggregates are scoped server-side. Keeping these three small RPCs separate from the
 * KPI queries means a chart failure does not blank the operational summary above it.
 */
export async function loadNdeChartData(
  client: SupabaseClient<Database>,
  projectId: string,
): Promise<NdeChartData> {
  const [outcomes, workflow, methods] = await Promise.all([
    client.rpc("nde_outcome_trend", { target_project_id: projectId }),
    client.rpc("nde_inspection_workflow_distribution", { target_project_id: projectId }),
    client.rpc("nde_method_distribution", { target_project_id: projectId }),
  ])
  fail(outcomes.error)
  fail(workflow.error)
  fail(methods.error)
  return {
    outcomes: required(outcomes.data),
    workflow: required(workflow.data),
    methods: required(methods.data),
  }
}

export async function loadQualityReferentials(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<QualityReferentials> {
  const [welders, reworkCodes] = await Promise.all([
    client
      .from("welder_qualifications")
      .select("id, welder_code, full_name")
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
  fail(welders.error)
  fail(reworkCodes.error)

  return {
    welders: (welders.data ?? []).map((row: Row) => ({
      id: row.id as string,
      welderCode: row.welder_code as string,
      fullName: (row.full_name as string) ?? null,
    })),
    reworkCodes: (reworkCodes.data ?? []).map((row: Row) => ({
      id: row.id as string,
      code: row.code as string,
      description: (row.description as string) ?? null,
    })),
  }
}

/**
 * record_nde_result refuses (PQC42) a welder who is not on the joint's weld
 * points, so the result form must only offer the welders who actually welded it.
 */
export async function loadJointWelderIds(
  client: SupabaseClient<Database>,
  weldJointRevisionId: string
): Promise<string[]> {
  const { data, error } = await client
    .from("weld_point_assignments")
    .select("welder_qualification_id, weld_progress_records!inner(weld_joint_revision_id)")
    .eq("weld_progress_records.weld_joint_revision_id", weldJointRevisionId)
  fail(error)
  return Array.from(
    new Set((data ?? []).map((row: Row) => row.welder_qualification_id as string))
  )
}

export async function loadNdeKpis(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<NdeKpis> {
  const { data: batches, error: bErr } = await client
    .from("nde_batches")
    .select("status", { count: "exact" })
    .eq("project_id", projectId)
  fail(bErr)

  const rows = batches ?? []
  const totalBatches = rows.length
  const openBatches = rows.filter((r) => r.status === "draft" || r.status === "issued").length

  const { data: obligations, error: oErr } = await client
    .from("nde_obligations")
    .select("disposition", { count: "exact" })
    .eq("project_id", projectId)
  fail(oErr)

  const oblRows = obligations ?? []
  const pendingObligations = oblRows.filter(
    (r) => !["satisfied", "waived", "superseded"].includes(r.disposition ?? "")
  ).length
  const satisfiedObligations = oblRows.filter((r) => r.disposition === "satisfied").length

  return { totalBatches, openBatches, pendingObligations, satisfiedObligations }
}
