import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { buildSpoolgenSubmission } from "../modules/engineering/application/import-spooling"
import type { SpoolgenFileRole } from "../modules/engineering/domain/spoolgen-file"

export const FIXTURE_OPERATOR = "track01.project-admin-a@example.test"
const SPOOLING_BUCKET = "project-spooling"

export const isLocalhost = (url: string): boolean => {
  try {
    return ["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname)
  } catch {
    return false
  }
}

const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Signs in as the fixture project admin. Every fixture mutation that must pass the real
 * guards runs as this account rather than through the service key, so a bootstrap can
 * never produce state the browser could not have produced.
 */
export async function signInFixtureOperator(
  url: string,
  publishableKey: string,
  password: string,
): Promise<SupabaseClient> {
  const operator = createClient(url, publishableKey)
  const auth = await operator.auth.signInWithPassword({ email: FIXTURE_OPERATOR, password })
  if (auth.error) {
    throw new Error(
      `Could not sign in as ${FIXTURE_OPERATOR}: ${auth.error.message}. Run the Track 01 bootstrap with the same TRACK01_FIXTURE_PASSWORD first.`,
    )
  }
  return operator
}

/**
 * Drives the real SpoolGen import as the signed-in operator, so the isometric, spool,
 * weld joints, weld points, supports and bill of materials are produced by the same code
 * path the browser uses and the revision guards stay in force. project_admin has
 * bypasses_functional_gate, so it holds spooling.manage without a functional role.
 *
 * Skips when the isometric already carries an accepted revision, which is what makes a
 * second bootstrap run leave identical state.
 */
export async function importSpoolgenDefinition(
  operator: SupabaseClient,
  projectId: string,
  isoNumber: string,
  files: Partial<Record<SpoolgenFileRole, string>>,
  comment: string,
): Promise<{ appliedRowCount: number; skipped: boolean }> {
  const { data: existing } = await operator
    .from("isometrics")
    .select("id, isometric_revisions(status)")
    .eq("project_id", projectId)
    .eq("iso_number", isoNumber)
    .maybeSingle()
  const alreadyAccepted = ((existing as any)?.isometric_revisions ?? []).some(
    (revision: { status: string }) => revision.status === "accepted",
  )
  if (alreadyAccepted) return { appliedRowCount: 0, skipped: true }

  const submission = buildSpoolgenSubmission(files)
  if (submission.summary.blockerCount > 0) {
    throw new Error(
      `The SpoolGen fixture files produced ${submission.summary.blockerCount} blockers: ` +
        submission.issues
          .filter((issue) => issue.severity === "blocker")
          .map((issue) => `${issue.code} ${issue.message}`)
          .join("; "),
    )
  }

  const job = await operator.rpc("create_spooling_import_job", {
    target_project_id: projectId,
    job_comment: comment,
  })
  if (job.error) throw new Error(job.error.message)
  const jobId = (job.data as { id: string }).id

  for (const role of Object.keys(files) as SpoolgenFileRole[]) {
    const text = files[role]
    if (text === undefined) continue
    const objectPath = `${projectId}/${jobId}/${role}.txt`
    const upload = await operator.storage
      .from(SPOOLING_BUCKET)
      .upload(objectPath, new Blob([text], { type: "text/plain" }), {
        upsert: true,
        contentType: "text/plain",
      })
    if (upload.error) throw new Error(upload.error.message)
    const register = await operator.rpc("register_spooling_import_file", {
      target_job_id: jobId,
      role,
      file_name: `${role}.txt`,
      media_type: "text/plain",
      size_bytes: new TextEncoder().encode(text).length,
      checksum: await sha256Hex(text),
      object_path: objectPath,
    })
    if (register.error) throw new Error(register.error.message)
  }

  const validation = await operator.rpc("record_spooling_validation", {
    target_job_id: jobId,
    parsed_rows: submission.rows.map((row) => ({
      row_number: row.rowNumber,
      raw_values: row.rawValues,
      normalized_values: row.normalizedValues,
      action: row.action,
    })),
    parsed_issues: submission.issues.map((issue) => ({
      row_number: issue.rowNumber,
      column_name: issue.columnName,
      severity: issue.severity,
      code: issue.code,
      message: issue.message,
    })),
  })
  if (validation.error) throw new Error(validation.error.message)

  const revalidated = await operator.rpc("revalidate_spooling_import_job", {
    target_job_id: jobId,
  })
  if (revalidated.error) throw new Error(revalidated.error.message)
  const counts = (revalidated.data as { blocker_count: number }[] | null)?.[0]
  if ((counts?.blocker_count ?? 0) > 0) {
    throw new Error(`The server revalidation reported ${counts?.blocker_count} blockers.`)
  }

  const applied = await operator.rpc("apply_spooling_import_job", { target_job_id: jobId })
  if (applied.error) throw new Error(applied.error.message)
  return {
    appliedRowCount: (applied.data as { applied_row_count: number }).applied_row_count,
    skipped: false,
  }
}
