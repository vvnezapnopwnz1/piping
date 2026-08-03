import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type {
  NdeBatch,
  NdeObligation,
  NdeResult,
  NdeKpis,
  NdtMethod,
} from "../domain/nde-batch"
import { mapSupabaseQualityError } from "./supabase-quality-errors"

export type {
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
    categoryCode: row.category_code as string,
    responsibleWelderQualificationId: (row.responsible_welder_qualification_id as string) ?? null,
    ndtSubcontractorId: (row.ndt_subcontractor_id as string) ?? null,
    status: row.status as NdeBatch["status"],
    issuedOn: (row.issued_on as string) ?? null,
    returnedOn: (row.returned_on as string) ?? null,
    closedOn: (row.closed_on as string) ?? null,
    reportNumber: (row.report_number as string) ?? null,
    createdAt: row.created_at as string,
  }
}

function toObligation(row: Row): NdeObligation {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    weldJointRevisionId: row.weld_joint_revision_id as string,
    spoolRevisionId: row.spool_revision_id as string,
    method: row.method as NdtMethod,
    requiredCoverage: row.required_coverage as number,
    selectionMode: row.selection_mode as string,
    categoryCode: row.category_code as string,
    disposition: row.disposition as NdeObligation["disposition"],
    cycleKind: row.cycle_kind as NdeObligation["cycleKind"],
    cycleOrdinal: row.cycle_ordinal as number,
    parentObligationId: (row.parent_obligation_id as string) ?? null,
    responsibleWelderQualificationId:
      (row.responsible_welder_qualification_id as string) ?? null,
  }
}

export async function loadNdeBatches(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<NdeBatch[]> {
  const { data, error } = await client
    .from("nde_batches")
    .select(
      "id, project_id, batch_number, method, category_code, responsible_welder_qualification_id, ndt_subcontractor_id, status, issued_on, returned_on, closed_on, report_number, created_at"
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
      "id, project_id, weld_joint_revision_id, spool_revision_id, method, required_coverage, selection_mode, category_code, disposition, cycle_kind, cycle_ordinal, parent_obligation_id, responsible_welder_qualification_id"
    )
    .eq("project_id", projectId)
  fail(error)
  return required(data).map(toObligation)
}

export async function createNdeBatch(
  client: SupabaseClient<Database>,
  projectId: string,
  method: NdtMethod,
  categoryCode: string,
  welderQualificationId: string | null,
  subcontractorId: string | null,
  idempotencyKey: string
): Promise<NdeBatch> {
  const { data, error } = await client.rpc("create_nde_batch", {
    target_project_id: projectId,
    method: method,
    category_code: categoryCode,
    welder_id: welderQualificationId ?? undefined,
    subcontractor_id: subcontractorId ?? undefined,
    idempotency_key: idempotencyKey,
  })
  fail(error)
  return toBatch(required(data) as Row)
}

export async function allocateNdeBatchCandidates(
  client: SupabaseClient<Database>,
  batchId: string,
  targetPercentage: number,
  idempotencyKey: string
): Promise<void> {
  const { error } = await client.rpc("allocate_nde_batch_candidates", {
    target_batch_id: batchId,
    target_percentage: targetPercentage,
    idempotency_key: idempotencyKey,
  })
  fail(error)
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
