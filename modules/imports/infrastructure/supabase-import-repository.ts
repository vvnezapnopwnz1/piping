import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type { ImportJob, ImportJobStatus } from "../domain/import-job"
import type { ImportIssue } from "../domain/import-issue"
import type { ImportType } from "../domain/import-type"
import type { ParsedRow } from "../domain/parsers/registry"
import { mapSupabaseImportError } from "./supabase-import-errors"

export const IMPORT_BUCKET = "project-imports"

export interface CreateImportJobInput {
  projectId: string
  importType: ImportType
  fileName: string
  mediaType: string
  sizeBytes: number
  checksum: string
}

// The Storage RLS policy resolves the project from the first path segment, so the
// path shape is a contract, not a convenience.
export function importObjectPath(projectId: string, jobId: string, fileName: string): string {
  const safeName = fileName.replace(/[^A-Za-z0-9._-]+/g, "-")
  return `${projectId}/${jobId}/${safeName}`
}

function toImportJob(row: any): ImportJob {
  return {
    id: row.id,
    projectId: row.project_id,
    importType: row.import_type,
    status: row.status as ImportJobStatus,
    sourceFileName: row.source_file_name ?? null,
    sourceMediaType: row.source_media_type ?? null,
    sourceSizeBytes: row.source_size_bytes ?? null,
    sourceChecksum: row.source_checksum ?? null,
    storagePath: row.storage_path ?? null,
    conflictsConfirmed: row.conflicts_confirmed === true,
    appliedRowCount: row.applied_row_count ?? 0,
    affectedEntityIds: row.affected_entity_ids ?? [],
    failureReason: row.failure_reason ?? null,
    createdAt: row.created_at,
    validatedAt: row.validated_at ?? null,
    appliedAt: row.applied_at ?? null,
    canceledAt: row.canceled_at ?? null,
  }
}

export async function createImportJob(
  client: SupabaseClient<Database>,
  input: CreateImportJobInput
): Promise<ImportJob> {
  const { data, error } = await client.rpc("create_import_job" as never, {
    target_project_id: input.projectId,
    requested_import_type: input.importType,
    file_name: input.fileName,
    media_type: input.mediaType,
    size_bytes: input.sizeBytes,
    checksum: input.checksum,
  } as never)

  if (error) throw new Error(mapSupabaseImportError(error))
  return toImportJob(data)
}

export async function uploadImportFile(
  client: SupabaseClient<Database>,
  objectPath: string,
  file: File
): Promise<void> {
  const { error } = await client.storage
    .from(IMPORT_BUCKET)
    .upload(objectPath, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(mapSupabaseImportError(error as never))
}

export async function markImportJobUploaded(
  client: SupabaseClient<Database>,
  jobId: string,
  objectPath: string
): Promise<ImportJob> {
  const { data, error } = await client.rpc("mark_import_job_uploaded" as never, {
    target_job_id: jobId,
    object_path: objectPath,
  } as never)

  if (error) throw new Error(mapSupabaseImportError(error))
  return toImportJob(data)
}

export async function recordImportValidation(
  client: SupabaseClient<Database>,
  jobId: string,
  rows: readonly ParsedRow[],
  issues: readonly ImportIssue[]
): Promise<ImportJob> {
  const { data, error } = await client.rpc("record_import_validation" as never, {
    target_job_id: jobId,
    parsed_rows: rows.map((row) => ({
      row_number: row.rowNumber,
      raw_values: row.rawValues,
      normalized_values: row.normalizedValues,
      action: row.action,
    })),
    parsed_issues: issues.map((issue) => ({
      row_number: issue.rowNumber,
      column_name: issue.columnName,
      severity: issue.severity,
      code: issue.code,
      message: issue.message,
    })),
  } as never)

  if (error) throw new Error(mapSupabaseImportError(error))
  return toImportJob(data)
}

export async function applyImportJob(
  client: SupabaseClient<Database>,
  jobId: string,
  confirmConflicts: boolean,
  importType?: ImportType,
): Promise<ImportJob> {
  const rpcName = importType === "flange_progress"
    ? "apply_flange_progress_import_job"
    : importType === "test_pack_composition"
      ? "apply_test_pack_import_job"
      : "apply_import_job"
  const { data, error } = await client.rpc(rpcName as never, {
    target_job_id: jobId,
    confirm_conflicts: confirmConflicts,
  } as never)

  if (error) throw new Error(mapSupabaseImportError(error))
  return toImportJob(data)
}

export async function cancelImportJob(
  client: SupabaseClient<Database>,
  jobId: string
): Promise<ImportJob> {
  const { data, error } = await client.rpc("cancel_import_job" as never, {
    target_job_id: jobId,
  } as never)

  if (error) throw new Error(mapSupabaseImportError(error))
  return toImportJob(data)
}

export async function loadImportHistory(
  client: SupabaseClient<Database>,
  projectId: string
): Promise<ImportJob[]> {
  const { data, error } = await client
    .from("import_jobs")
    .select(
      "id, project_id, import_type, status, source_file_name, source_media_type, source_size_bytes, source_checksum, storage_path, conflicts_confirmed, applied_row_count, affected_entity_ids, failure_reason, created_at, validated_at, applied_at, canceled_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(mapSupabaseImportError(error))
  return (data ?? []).map(toImportJob)
}

export async function loadImportIssues(
  client: SupabaseClient<Database>,
  jobId: string
): Promise<ImportIssue[]> {
  const { data, error } = await client
    .from("import_job_issues")
    .select("row_number, column_name, severity, code, message")
    .eq("job_id", jobId)
    .order("row_number", { ascending: true })

  if (error) throw new Error(mapSupabaseImportError(error))
  return (data ?? []).map((row: any) => ({
    rowNumber: row.row_number,
    columnName: row.column_name,
    severity: row.severity,
    code: row.code,
    message: row.message,
  }))
}

export async function getImportFileSignedUrl(
  client: SupabaseClient<Database>,
  storagePath: string
): Promise<string | null> {
  const { data, error } = await client.storage
    .from(IMPORT_BUCKET)
    .createSignedUrl(storagePath, 300)

  if (error) return null
  return data?.signedUrl ?? null
}
