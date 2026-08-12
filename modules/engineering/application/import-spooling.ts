import type { ImportIssue } from "@/modules/imports/domain/import-issue"
import { buildStagingRows, type StagingRow } from "../domain/definition"
import { checkCrossFileConsistency, checkIsoUniformity, emptyFileSet, type SpoolgenFileSet } from "../domain/parsers/cross-file"
import { parseSpoolgenFile } from "../domain/parsers/spoolgen-parser"
import { SPOOLGEN_FILE_ROLES, missingRequiredRoles, type SpoolgenFileRole } from "../domain/spoolgen-file"

export interface SpoolgenSubmission { rows: StagingRow[]; issues: ImportIssue[]; summary: { blockerCount: number; warningCount: number }; canSubmit: boolean }
export function buildSpoolgenSubmission(files: Partial<Record<SpoolgenFileRole, string>>): SpoolgenSubmission {
  const issues: ImportIssue[] = []; const set: SpoolgenFileSet = emptyFileSet(); const present: SpoolgenFileRole[] = []
  for (const role of SPOOLGEN_FILE_ROLES) { const text = files[role]; if (text === undefined) continue; present.push(role); const parsed = parseSpoolgenFile(role, text); set[role] = parsed.records; issues.push(...parsed.issues) }
  for (const role of missingRequiredRoles(present)) issues.push({ rowNumber: null, columnName: role, severity: "blocker", code: "MISSING_REQUIRED_FILE", message: `${role}.txt is required before a SpoolGen import can be validated.` })
  issues.push(...checkIsoUniformity(set.weld), ...checkCrossFileConsistency(set))
  const blockerCount = issues.filter((issue) => issue.severity === "blocker").length
  const warningCount = issues.filter((issue) => issue.severity === "warning").length
  return { rows: buildStagingRows(set), issues, summary: { blockerCount, warningCount }, canSubmit: missingRequiredRoles(present).length === 0 }
}
