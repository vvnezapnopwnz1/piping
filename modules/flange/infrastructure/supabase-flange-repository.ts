import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type { NormalizedFlangeProgressInput } from "../domain/flange-progress"
import type {
  FlangeFormOptions,
  FlangeProgressRecord,
  FlangeRepository,
  FlangeWorklistItem,
} from "../application/record-flange-progress"
import { mapSupabaseFlangeError } from "./supabase-flange-errors"

type Row = Record<string, any>
const fail = (error: { code?: string; message?: string } | null): void => { if (error) throw new Error(mapSupabaseFlangeError(error)) }

function toWorklist(row: Row): FlangeWorklistItem {
  return {
    flangeJointRevisionId: row.flange_joint_revision_id,
    projectId: row.project_id ?? null,
    isoNumber: row.iso_number ?? null,
    spoolNumber: row.spool_number ?? null,
    revisionNumber: row.revision_number ?? null,
    lineNumber: row.line_number ?? null,
    pdsCode: row.pds_code ?? null,
    flangeNumber: row.flange_number ?? null,
    flangeRating: row.flange_rating ?? null,
    diameterInch: row.diameter_inch == null ? null : Number(row.diameter_inch),
    progressState: row.progress_state ?? null,
    effectiveProgressId: row.effective_progress_id ?? null,
    jointCategoryId: row.joint_category_id ?? null,
    torquingRequirementId: row.torquing_requirement_id ?? null,
    jointingValue: row.jointing_value == null ? null : Number(row.jointing_value),
    jointDate: row.joint_date ?? null,
    calculatedUt: row.calculated_ut == null ? null : Number(row.calculated_ut),
  }
}

function toProgressRecord(row: Row): FlangeProgressRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    flangeJointRevisionId: row.flange_joint_revision_id,
    jointCategoryId: row.joint_category_id,
    torquingRequirementId: row.torquing_requirement_id,
    jointingValue: Number(row.jointing_value),
    jointDate: row.joint_date,
    reportNumber: row.report_number,
    tagNumber: row.tag_number,
    jointerIds: row.jointer_ids ?? [],
    idempotencyKey: row.idempotency_key ?? "",
    replacesProgressId: row.supersedes_record_id ?? undefined,
    calculatedUt: row.calculated_ut == null ? null : Number(row.calculated_ut),
    sourceKind: row.source_kind,
  }
}

export async function listFlangeWorklist(client: SupabaseClient<Database>, projectId: string): Promise<FlangeWorklistItem[]> {
  const { data, error } = await client.from("flange_joint_worklist").select("*").eq("project_id", projectId).order("flange_number")
  fail(error)
  return (data ?? []).map((row) => toWorklist(row as Row))
}

export async function listFlangeHistory(client: SupabaseClient<Database>, projectId: string, flangeJointRevisionId?: string): Promise<Array<Record<string, unknown>>> {
  let query = client.from("flange_progress_history").select("*").eq("project_id", projectId)
  if (flangeJointRevisionId) query = query.eq("flange_joint_revision_id", flangeJointRevisionId)
  const { data, error } = await query.order("recorded_at", { ascending: false })
  fail(error)
  return (data ?? []) as Array<Record<string, unknown>>
}

export async function listFlangeFormOptions(client: SupabaseClient<Database>, projectId: string): Promise<FlangeFormOptions> {
  const [categories, requirements, jointers] = await Promise.all([
    client.from("project_joint_categories").select("id, category_code, joint_definition, timing, reason, coefficient").eq("project_id", projectId).eq("status", "active").order("category_code"),
    client.from("system_reference_entries").select("id, code, description").eq("kind", "torquing_requirement").eq("status", "active").order("code"),
    client.from("project_teams").select("id, code, description").eq("project_id", projectId).eq("team_type", "jointer").eq("status", "active").order("code"),
  ])
  fail(categories.error); fail(requirements.error); fail(jointers.error)
  return { categories: (categories.data ?? []) as Array<Record<string, unknown>>, torquingRequirements: (requirements.data ?? []) as Array<Record<string, unknown>>, jointers: (jointers.data ?? []) as Array<Record<string, unknown>> }
}

export async function recordFlangeProgress(client: SupabaseClient<Database>, input: NormalizedFlangeProgressInput): Promise<FlangeProgressRecord> {
  const { data, error } = await client.rpc("record_flange_progress", {
    target_project_id: input.projectId,
    target_flange_joint_revision_id: input.flangeJointRevisionId,
    target_joint_category_id: input.jointCategoryId,
    target_torquing_requirement_id: input.torquingRequirementId,
    target_jointing_value: input.jointingValue,
    target_joint_date: input.jointDate,
    target_report_number: input.reportNumber,
    target_tag_number: input.tagNumber,
    target_jointer_ids: input.jointerIds,
    target_idempotency_key: input.idempotencyKey,
    target_replaces_progress_id: input.replacesProgressId,
  })
  fail(error)
  const row = (data as Row | null)?.record
  if (!row) throw new Error(mapSupabaseFlangeError(null))
  return toProgressRecord(row)
}

export async function materializeFlangeProgressCopies(client: SupabaseClient<Database>, projectId: string, idempotencyKey: string): Promise<{ createdCount: number }> {
  const { data, error } = await client.rpc("materialize_flange_progress_copies", { target_project_id: projectId, target_idempotency_key: idempotencyKey })
  fail(error)
  return { createdCount: Number((data as Row | null)?.created_count ?? 0) }
}

export function createSupabaseFlangeRepository(client: SupabaseClient<Database>): FlangeRepository {
  return {
    listFlangeWorklist: (projectId) => listFlangeWorklist(client, projectId),
    listFlangeHistory: (projectId, revisionId) => listFlangeHistory(client, projectId, revisionId),
    listFlangeFormOptions: (projectId) => listFlangeFormOptions(client, projectId),
    recordFlangeProgress: (input) => recordFlangeProgress(client, input),
    materializeFlangeProgressCopies: (projectId, key) => materializeFlangeProgressCopies(client, projectId, key),
  }
}
