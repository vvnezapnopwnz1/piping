import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "../../lib/supabase/database.types"
import { materializeProgressCopies } from "../../modules/construction/infrastructure/supabase-construction-repository"
import { buildPcfSubmission, inFileNameOrder } from "../../modules/engineering/application/import-pcf"
import { buildSpoolgenSubmission, type SpoolgenSubmission } from "../../modules/engineering/application/import-spooling"
import { readWorkbookUpload } from "../../modules/engineering/application/import-table"
import { DEFAULT_PCF_SETTINGS } from "../../modules/engineering/domain/import-template"
import { unresolvedItems } from "../../modules/engineering/application/resolve-revision"
import { SPOOLGEN_FILE_ROLES, type SpoolgenFileRole } from "../../modules/engineering/domain/spoolgen-file"
import {
  applySpoolingImportJob,
  createSpoolingImportJob,
  loadPreview,
  recordRevisionDecision,
  recordSpoolingValidation,
  registerSpoolgenFile,
  revalidateSpoolingImportJob,
  uploadSpoolgenFile,
  type ValidationCounts,
} from "../../modules/engineering/infrastructure/supabase-engineering-repository"
import { submitSpoolingImport, type SpoolingUpload } from "../../modules/engineering/infrastructure/submit-spooling-import"
import { readNumberedSheets } from "../../modules/imports/infrastructure/xlsx-workbook"

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

export interface SpoolingOptions {
  readonly expectBlockers?: boolean
  readonly decision?: "done_without_modification" | "rework" | "not_done" | "cancelled"
}

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/** The client-side read must be clean before anything is sent, as the screen refuses a file set with blockers. */
function assertNoClientBlockers(submission: SpoolgenSubmission, what: string): void {
  if (submission.summary.blockerCount > 0) {
    throw new Error(`${what} produced ${submission.summary.blockerCount} client blockers.`)
  }
}

/**
 * The tail every source shares, after the job holds its rows and the server has checked them: stop on blockers,
 * record the revision decisions, apply, and carry the progress over as the revision workbench does.
 */
async function finishSpoolingJob(
  client: SupabaseClient<Database>,
  jobId: string,
  counts: ValidationCounts,
  comment: string,
  options: SpoolingOptions,
): Promise<SpoolingOutcome> {
  if (counts.blockerCount > 0) {
    if (options.expectBlockers) {
      return { jobId, status: "blocked", blockerCount: counts.blockerCount, warningCount: counts.warningCount, decisions: 0 }
    }
    throw new Error(`The server revalidation reported ${counts.blockerCount} blockers for "${comment}".`)
  }
  let decisions = 0
  if (counts.unresolvedCount > 0) {
    const pending = unresolvedItems(await loadPreview(client, jobId))
    for (const item of pending) {
      await recordRevisionDecision(client, jobId, item, options.decision ?? "done_without_modification", "UPG-1 dry run")
      decisions += 1
    }
  }
  const applied = await applySpoolingImportJob(client, jobId)
  // As the revision workbench does: the apply authorizes the carry-over, this performs it.
  for (const revisionId of applied.affectedEntityIds) await materializeProgressCopies(client, revisionId)
  return { jobId, status: "applied", blockerCount: 0, warningCount: counts.warningCount, decisions }
}

/** The four SpoolGen texts, one file per role. */
export async function importSpoolgenPackage(
  client: SupabaseClient<Database>,
  projectId: string,
  files: Partial<Record<SpoolgenFileRole, string>>,
  comment: string,
  options: SpoolingOptions = {},
): Promise<SpoolingOutcome> {
  const submission = buildSpoolgenSubmission(files)
  assertNoClientBlockers(submission, "The SpoolGen files")
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
  return finishSpoolingJob(client, job.id, await revalidateSpoolingImportJob(client, job.id), comment, options)
}

/**
 * One workbook with the sheets WELD, TRACE, BOLT, SUPP, read and sent as the Excel panel does: the sheets by
 * `readNumberedSheets`, the rows by `readWorkbookUpload`, the file stored under the weld role. The job's own comment stays
 * empty (`submitSpoolingImport` sets none, as in the app); `comment` names the import in messages.
 */
export async function importSpoolingWorkbook(
  client: SupabaseClient<Database>,
  projectId: string,
  workbookBytes: Uint8Array,
  fileName: string,
  comment: string,
  options: SpoolingOptions = {},
): Promise<SpoolingOutcome> {
  const reading = readWorkbookUpload(fileName, readNumberedSheets(workbookBytes, SPOOLGEN_FILE_ROLES))
  if (reading.kind === "noWeldSheet") throw new Error(`${fileName} has no WELD sheet with rows.`)
  if (reading.kind === "missingColumns") {
    throw new Error(`${fileName} misses columns: ${reading.sheets.map((sheet) => `${sheet.sheet}: ${sheet.headers.join(", ")}`).join("; ")}.`)
  }
  assertNoClientBlockers(reading.submission, fileName)
  const uploads: SpoolingUpload[] = [{ role: "weld", file: new File([workbookBytes], fileName, { type: XLSX_TYPE }) }]
  const sent = await submitSpoolingImport(client, projectId, reading.submission, uploads)
  return finishSpoolingJob(client, sent.jobId, sent.counts, comment, options)
}

/**
 * PCF files, one isometric each, read with the default PCF settings and one PDS area for the whole upload, as the PCF
 * panel does. The files go in name order, which is also the order of the rows.
 */
export async function importSpoolingPcf(
  client: SupabaseClient<Database>,
  projectId: string,
  pcfFiles: readonly { fileName: string; text: string }[],
  context: { pdsArea: string },
  comment: string,
  options: SpoolingOptions = {},
): Promise<SpoolingOutcome> {
  const submission = buildPcfSubmission(pcfFiles, { pdsArea: context.pdsArea, settings: DEFAULT_PCF_SETTINGS })
  if (!submission.canSubmit) throw new Error("The PCF files cannot be sent: no files, no PDS area or a repeated file name.")
  assertNoClientBlockers(submission, "The PCF files")
  const uploads: SpoolingUpload[] = inFileNameOrder(pcfFiles, (source) => source.fileName).map((source) => ({ role: "pcf", file: new File([source.text], source.fileName) }))
  const sent = await submitSpoolingImport(client, projectId, submission, uploads)
  return finishSpoolingJob(client, sent.jobId, sent.counts, comment, options)
}
