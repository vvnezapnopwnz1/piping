import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type { StoredImportIssue } from "@/modules/imports/domain/stored-import-issue"
import type { SpoolgenSubmission } from "../application/import-spooling"
import type { SpoolingFileRole } from "../domain/spoolgen-file"
import { computeFileChecksum } from "./spoolgen-file-reader"
import {
  createSpoolingImportJob,
  loadJobIssues,
  recordSpoolingValidation,
  registerSpoolgenFile,
  revalidateSpoolingImportJob,
  spoolingObjectPath,
  uploadSpoolgenFile,
  type ValidationCounts,
} from "./supabase-engineering-repository"

export interface SpoolingUpload { role: SpoolingFileRole; file: File }

/**
 * Every source ends here: a new job, each file stored and registered under its role with its place in the upload, the
 * rows and issues read in the browser, then the server's own checks. Returns what the server holds for the job.
 */
export async function submitSpoolingImport(
  client: SupabaseClient<Database>,
  projectId: string,
  submission: SpoolgenSubmission,
  uploads: readonly SpoolingUpload[],
): Promise<{ jobId: string; issues: StoredImportIssue[]; counts: ValidationCounts }> {
  const job = await createSpoolingImportJob(client, projectId, null)
  for (const [index, { role, file }] of uploads.entries()) {
    const path = spoolingObjectPath(projectId, job.id, role, index, file.name)
    await uploadSpoolgenFile(client, path, file)
    await registerSpoolgenFile(client, job.id, role, file, await computeFileChecksum(file), path)
  }
  await recordSpoolingValidation(client, job.id, submission.rows, submission.issues)
  const counts = await revalidateSpoolingImportJob(client, job.id)
  return { jobId: job.id, issues: await loadJobIssues(client, job.id), counts }
}
