"use client"

import { useTranslations } from "next-intl"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import type { ImportIssueSeverity, ImportRowIssue } from "../domain/import-issue"
import type { StoredImportIssue } from "../domain/stored-import-issue"
import { describeImportIssue, describeIssueLocation } from "./import-issue-text"

/**
 * Import severities are their own vocabulary — a `conflict` is not a workflow state — so they name
 * their tone here rather than going through the status map. The literal `red-100`/`amber-100`
 * surfaces they used to carry stayed light when the app went dark.
 */
export const SEVERITY_TONE: Record<ImportIssueSeverity, StatusTone> = {
  blocker: "danger",
  conflict: "warning",
  warning: "neutral",
}

export const SEVERITY_STYLE: Record<ImportIssueSeverity, string> = {
  blocker: "bg-danger-bg text-danger-fg border-danger-border",
  conflict: "bg-warning-bg text-warning-fg border-warning-border",
  warning: "bg-neutral-bg text-neutral-fg border-neutral-border",
}

/**
 * `StoredImportIssue` rows come from the SpoolGen import in `modules/engineering`, which still sends its
 * own sentence; they show it until that module moves to codes. Import validation never produces one.
 * An import of many files names the file before the row; see `describeIssueLocation`.
 */
export function ImportIssueList({ issues }: { issues: readonly (ImportRowIssue | StoredImportIssue)[] }) {
  const t = useTranslations("spooling")

  if (issues.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("issueList.empty")}</p>
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
            label={t(`severity.${issue.severity}`)}
            className="bg-transparent"
          />
          <span className="font-mono text-xs">{describeIssueLocation(t, issue)}</span>
          <span>{"message" in issue ? issue.message : describeImportIssue(t, issue)}</span>
        </li>
      ))}
    </ul>
  )
}
