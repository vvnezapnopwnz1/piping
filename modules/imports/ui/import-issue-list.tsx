"use client"

import { Badge } from "@/components/ui/badge"
import type { ImportIssue, ImportIssueSeverity } from "../domain/import-issue"

const SEVERITY_STYLE: Record<ImportIssueSeverity, string> = {
  blocker: "bg-red-100 text-red-900 border-red-300",
  conflict: "bg-amber-100 text-amber-900 border-amber-300",
  warning: "bg-slate-100 text-slate-700 border-slate-300",
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
          <Badge variant="outline">{SEVERITY_LABEL[issue.severity]}</Badge>
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
