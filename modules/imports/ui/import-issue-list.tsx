"use client"

import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import type { ImportIssue, ImportIssueSeverity } from "../domain/import-issue"

/**
 * Import severities are their own vocabulary — a `conflict` is not a workflow state — so they name
 * their tone here rather than going through the status map. The literal `red-100`/`amber-100`
 * surfaces they used to carry stayed light when the app went dark.
 */
const SEVERITY_TONE: Record<ImportIssueSeverity, StatusTone> = {
  blocker: "danger",
  conflict: "warning",
  warning: "neutral",
}

const SEVERITY_STYLE: Record<ImportIssueSeverity, string> = {
  blocker: "bg-danger-bg text-danger-fg border-danger-border",
  conflict: "bg-warning-bg text-warning-fg border-warning-border",
  warning: "bg-neutral-bg text-neutral-fg border-neutral-border",
}

const SEVERITY_LABEL: Record<ImportIssueSeverity, string> = {
  blocker: "Error",
  conflict: "Overwrite",
  warning: "Warning",
}

export function ImportIssueList({ issues }: { issues: readonly ImportIssue[] }) {
  if (issues.length === 0) {
    return <p className="text-sm text-muted-foreground">No issues were found in this file.</p>
  }

  return (
    <ul className="space-y-2">
      {issues.map((issue, index) => (
        <li
          key={`${issue.code}-${issue.rowNumber ?? "sheet"}-${index}`}
          className={`flex items-start gap-3 rounded-md border px-3 py-2 text-sm ${SEVERITY_STYLE[issue.severity]}`}
        >
          <StatusBadge
            status={issue.severity}
            tone={SEVERITY_TONE[issue.severity]}
            label={SEVERITY_LABEL[issue.severity]}
            className="bg-transparent"
          />
          <span className="font-mono text-xs">
            {issue.rowNumber === null ? "Sheet" : `Row ${issue.rowNumber}`}
            {issue.columnName ? ` · ${issue.columnName}` : ""}
          </span>
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  )
}
