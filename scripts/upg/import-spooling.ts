import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../lib/supabase/database.types"
import { materializeProgressCopies } from "../../modules/construction/infrastructure/supabase-construction-repository"
import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"
import { unresolvedItems } from "../../modules/engineering/application/resolve-revision"
import type { SpoolgenFileRole } from "../../modules/engineering/domain/spoolgen-file"
import {
  applySpoolingImportJob,
  createSpoolingImportJob,
  loadPreview,
  recordRevisionDecision,
  recordSpoolingValidation,
  registerSpoolgenFile,
  revalidateSpoolingImportJob,
  uploadSpoolgenFile,
} from "../../modules/engineering/infrastructure/supabase-engineering-repository"

export interface SpoolingOutcome {
  readonly jobId: string
  readonly status: "applied" | "blocked"
  readonly blockerCount: number
  readonly warningCount: number
  readonly decisions: number
}

const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function importSpoolgenPackage(
  client: SupabaseClient<Database>,
  projectId: string,
  files: Partial<Record<SpoolgenFileRole, string>>,
  comment: string,
  options: { expectBlockers?: boolean; decision?: "done_without_modification" | "rework" | "not_done" | "cancelled" } = {},
): Promise<SpoolingOutcome> {
  const submission = buildSpoolgenSubmission(files)
  if (submission.summary.blockerCount > 0) {
    throw new Error(`The SpoolGen files produced ${submission.summary.blockerCount} client blockers.`)
  }
  const job = await createSpoolingImportJob(client, projectId, comment)
  for (const role of Object.keys(files) as SpoolgenFileRole[]) {
    const text = files[role]
    if (text === undefined) continue
    const file = new File([text], `${role}.txt`, { type: "text/plain" })
    const objectPath = `${projectId}/${job.id}/${role}.txt`
    await uploadSpoolgenFile(client, objectPath, file)
    await registerSpoolgenFile(client, job.id, role, file, await sha256Hex(text), objectPath)
  }
  await recordSpoolingValidation(client, job.id, submission.rows, submission.issues)
  const counts = await revalidateSpoolingImportJob(client, job.id)
  if (counts.blockerCount > 0) {
    if (options.expectBlockers) {
      return { jobId: job.id, status: "blocked", blockerCount: counts.blockerCount, warningCount: counts.warningCount, decisions: 0 }
    }
    throw new Error(`The server revalidation reported ${counts.blockerCount} blockers for "${comment}".`)
  }
  let decisions = 0
  if (counts.unresolvedCount > 0) {
    const pending = unresolvedItems(await loadPreview(client, job.id))
    for (const item of pending) {
      await recordRevisionDecision(client, job.id, item, options.decision ?? "done_without_modification", "UPG-1 dry run")
      decisions += 1
    }
  }
  const applied = await applySpoolingImportJob(client, job.id)
  // As the revision workbench does: the apply authorizes the carry-over, this performs it.
  for (const revisionId of applied.affectedEntityIds) await materializeProgressCopies(client, revisionId)
  return { jobId: job.id, status: "applied", blockerCount: 0, warningCount: counts.warningCount, decisions }
}
