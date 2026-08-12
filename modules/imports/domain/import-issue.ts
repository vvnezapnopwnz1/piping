export type ImportIssueSeverity = "blocker" | "conflict" | "warning"

export interface ImportIssue {
  rowNumber: number | null
  columnName: string | null
  severity: ImportIssueSeverity
  code: string
  message: string
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

export function summarizeIssues(issues: readonly ImportIssue[]): ImportIssueSummary {
  const summary: ImportIssueSummary = { blockerCount: 0, conflictCount: 0, warningCount: 0 }
  for (const issue of issues) {
    if (issue.severity === "blocker") summary.blockerCount += 1
    else if (issue.severity === "conflict") summary.conflictCount += 1
    else summary.warningCount += 1
  }
  return summary
}

export function issuesForRow(issues: readonly ImportIssue[], rowNumber: number): ImportIssue[] {
  return issues.filter((issue) => issue.rowNumber === rowNumber)
}

export function highestSeverity(issues: readonly ImportIssue[]): ImportIssueSeverity | null {
  let best: ImportIssueSeverity | null = null
  for (const issue of issues) {
    if (best === null || SEVERITY_RANK[issue.severity] > SEVERITY_RANK[best]) {
      best = issue.severity
    }
  }
  return best
}
