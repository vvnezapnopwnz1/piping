import { buildStagingRows, type StagingRow } from "../domain/definition"
import { checkCrossFileConsistency, checkIsoUniformity, emptyFileSet, type SpoolgenFileSet } from "../domain/parsers/cross-file"
import { parseSpoolgenFile } from "../domain/parsers/spoolgen-parser"
import { spoolgenIssue, type SpoolgenIssue } from "../domain/spoolgen-issue"
import { SPOOLGEN_FILE_ROLES, missingRequiredRoles, type SpoolgenFileRole } from "../domain/spoolgen-file"

export interface SpoolgenSubmission { rows: StagingRow[]; issues: SpoolgenIssue[]; summary: { blockerCount: number; warningCount: number }; canSubmit: boolean }
// Every source ends here: the records of one upload, the issues found while reading them, and whether the upload can be sent at all.
export function buildSubmissionFromSet(set: SpoolgenFileSet, issues: readonly SpoolgenIssue[], canSubmit: boolean): SpoolgenSubmission {
  const all = [...issues, ...checkIsoUniformity(set.weld), ...checkCrossFileConsistency(set)]
  const blockerCount = all.filter((issue) => issue.severity === "blocker").length
  const warningCount = all.filter((issue) => issue.severity === "warning").length
  return { rows: buildStagingRows(set), issues: all, summary: { blockerCount, warningCount }, canSubmit }
}
export function buildSpoolgenSubmission(files: Partial<Record<SpoolgenFileRole, string>>): SpoolgenSubmission {
  const issues: SpoolgenIssue[] = []; const set: SpoolgenFileSet = emptyFileSet(); const present: SpoolgenFileRole[] = []
  for (const role of SPOOLGEN_FILE_ROLES) { const text = files[role]; if (text === undefined) continue; present.push(role); const parsed = parseSpoolgenFile(role, text); set[role] = parsed.records; issues.push(...parsed.issues) }
  for (const role of missingRequiredRoles(present)) issues.push(spoolgenIssue("MISSING_REQUIRED_FILE", null, role))
  return buildSubmissionFromSet(set, issues, missingRequiredRoles(present).length === 0)
}
