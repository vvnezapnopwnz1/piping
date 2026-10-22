"use client"

import { useTranslations } from "next-intl"
import { StatusBadge } from "@/components/ui/status-badge"
import { SEVERITY_STYLE, SEVERITY_TONE } from "@/modules/imports/ui/import-issue-list"
import { countIssueEntries, type IssueEntry } from "../application/issue-entries"
import { describeIssueEntry, describeIssuePlace } from "./issue-entry-text"

/**
 * What a check found, after it ran: one line that says what to do next, then one entry per reason with the sheet,
 * column and rows it points at.
 */
export function IssueEntryList({ entries }: { entries: readonly IssueEntry[] }) {
  const t = useTranslations("spooling")
  const { errors } = countIssueEntries(entries)

  return (
    <div className="space-y-2">
      <p className={`text-sm font-medium ${errors > 0 ? "text-danger-fg" : "text-muted-foreground"}`}>
        {errors > 0 ? t("issueSummary.errors", { count: errors }) : t("issueSummary.none")}
      </p>
      {entries.length > 0 ? (
        <ul className="space-y-2">
          {entries.map((entry, index) => {
            const place = describeIssuePlace(t, entry.place)
            return (
              <li key={`${entry.code}-${index}`} className={`flex items-start gap-3 rounded-md border px-3 py-2 text-sm ${SEVERITY_STYLE[entry.severity]}`}>
                <StatusBadge status={entry.severity} tone={SEVERITY_TONE[entry.severity]} label={t(`severity.${entry.severity}`)} className="bg-transparent" />
                <div className="min-w-0 space-y-0.5">
                  <p>{describeIssueEntry(t, entry)}</p>
                  {place ? <p className="text-xs opacity-80">{place}</p> : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
