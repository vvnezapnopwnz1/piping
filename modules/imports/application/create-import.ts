import type { ImportType } from "../domain/import-type"
import { parseSheet, type ParsedRow, type SheetMatrix } from "../domain/parsers/registry"
import { applyTypeRules } from "../domain/parsers/rules"
import {
  summarizeIssues,
  type ImportIssue,
  type ImportIssueSummary,
} from "../domain/import-issue"

export interface ValidationOutcome {
  rows: ParsedRow[]
  issues: ImportIssue[]
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
