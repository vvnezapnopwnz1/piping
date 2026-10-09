export type ImportIssueSeverity = "blocker" | "conflict" | "warning"

/** Every code a validation can report. The UI has one sentence per code, in each language. */
export const IMPORT_ISSUE_CODES = [
  "EMPTY_SHEET",
  "MISSING_COLUMN",
  "REQUIRED",
  "NOT_A_NUMBER",
  "TRACKING_DIRECTION",
  "TRACKING_TIMESTAMP",
  "INVALID_RANGE",
  "OUT_OF_RANGE",
  "DUPLICATE_IN_FILE",
  "INVALID_DATE",
  "INVALID_VALUE",
  "INCONSISTENT_TEST_PACK_METADATA",
  "DUPLICATE_JOINTER",
  "UT_CONFIGURATION_WARNING",
  "OVERWRITE",
] as const

export type ImportIssueCode = (typeof IMPORT_ISSUE_CODES)[number]

/** What a person needs to read the issue: the code plus named values, never a sentence. */
export type ImportIssueDetail =
  | { code: "EMPTY_SHEET" }
  | { code: "MISSING_COLUMN"; header: string }
  | { code: "REQUIRED"; header: string }
  | { code: "NOT_A_NUMBER"; header: string; received: string }
  | { code: "TRACKING_DIRECTION" }
  | { code: "TRACKING_TIMESTAMP" }
  | { code: "INVALID_RANGE"; range: "diameter" | "thickness" | "plannedDates" }
  | { code: "OUT_OF_RANGE"; bound: "positive" | "percent" }
  | { code: "DUPLICATE_IN_FILE"; keys: readonly string[] }
  | { code: "INVALID_DATE" }
  | { code: "INVALID_VALUE"; expected: readonly string[] }
  | { code: "INCONSISTENT_TEST_PACK_METADATA" }
  | { code: "DUPLICATE_JOINTER" }
  | { code: "UT_CONFIGURATION_WARNING" }
  | { code: "OVERWRITE" }

export type ImportRowIssue = {
  rowNumber: number | null
  columnName: string | null
  severity: ImportIssueSeverity
} & ImportIssueDetail

export type { StoredImportIssue as ImportIssue } from "./stored-import-issue"

interface SeverityIssue {
  rowNumber: number | null
  severity: ImportIssueSeverity
}

export interface ImportIssueSummary {
  blockerCount: number
  conflictCount: number
  warningCount: number
}

const SEVERITY_RANK: Record<ImportIssueSeverity, number> = {
  blocker: 3,
  conflict: 2,
  warning: 1,
}

export function summarizeIssues(issues: readonly SeverityIssue[]): ImportIssueSummary {
  const summary: ImportIssueSummary = { blockerCount: 0, conflictCount: 0, warningCount: 0 }
  for (const issue of issues) {
    if (issue.severity === "blocker") summary.blockerCount += 1
    else if (issue.severity === "conflict") summary.conflictCount += 1
    else summary.warningCount += 1
  }
  return summary
}

export function issuesForRow<T extends SeverityIssue>(issues: readonly T[], rowNumber: number): T[] {
  return issues.filter((issue) => issue.rowNumber === rowNumber)
}

export function highestSeverity(issues: readonly SeverityIssue[]): ImportIssueSeverity | null {
  let best: ImportIssueSeverity | null = null
  for (const issue of issues) {
    if (best === null || SEVERITY_RANK[issue.severity] > SEVERITY_RANK[best]) {
      best = issue.severity
    }
  }
  return best
}
