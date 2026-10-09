import type { StoredImportIssue } from "../domain/stored-import-issue"
import type { ImportType } from "../domain/import-type"
import { parseSheet, type ParsedRow, type SheetMatrix } from "../domain/parsers/registry"
import { applyTypeRules } from "../domain/parsers/rules"
import {
  summarizeIssues,
  type ImportIssueSummary,
  type ImportRowIssue,
} from "../domain/import-issue"

export interface ValidationOutcome {
  rows: ParsedRow[]
  issues: ImportRowIssue[]
  summary: ImportIssueSummary
  canSubmit: boolean
}

export function validateSheet(importType: ImportType, sheet: SheetMatrix): ValidationOutcome {
  const parsed = parseSheet(importType, sheet)
  const ruleIssues = applyTypeRules(importType, parsed.rows)
  const issues = [...parsed.issues, ...ruleIssues]

  return {
    rows: parsed.rows,
    issues,
    summary: summarizeIssues(issues),
    // A job is always recorded, even when it has blockers: the user needs the
    // durable issue list to fix the file. Apply is what the blockers gate.
    canSubmit: true,
  }
}

/** The row the database keeps. Its text is the code; the sentence is chosen on screen, in the user's language. */
export function toStoredIssues(issues: readonly ImportRowIssue[]): StoredImportIssue[] {
  return issues.map((issue) => ({
    rowNumber: issue.rowNumber,
    columnName: issue.columnName,
    severity: issue.severity,
    code: issue.code,
    message: issue.code,
  }))
}
