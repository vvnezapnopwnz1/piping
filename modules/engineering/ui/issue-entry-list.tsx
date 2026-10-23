"use client"

import { Download } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { downloadBlob } from "@/lib/download-blob"
import { buildWorkbook } from "@/modules/imports/infrastructure/xlsx-workbook"
import { SEVERITY_STYLE, SEVERITY_TONE } from "@/modules/imports/ui/import-issue-list"
import { countIssueEntries, type IssueEntry } from "../application/issue-entries"
import { issueEntriesRows } from "./issue-entries-export"
import { describeIssueEntry, describeIssuePlace } from "./issue-entry-text"

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/**
 * What a check found, after it ran: one line that says what to do next, then one entry per reason with the sheet,
 * column and rows it points at.
 */
export function IssueEntryList({ entries }: { entries: readonly IssueEntry[] }) {
  const t = useTranslations("spooling")
  const { errors } = countIssueEntries(entries)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <p className={`text-sm font-medium ${errors > 0 ? "text-danger-fg" : "text-muted-foreground"}`}>
          {errors > 0 ? t("issueSummary.errors", { count: errors }) : t("issueSummary.none")}
        </p>
        {entries.length > 0 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => downloadBlob(new Blob([buildWorkbook([{ name: t("issueExport.sheet"), rows: issueEntriesRows(t, entries) }])], { type: XLSX_TYPE }), "import-issues.xlsx")}>
            <Download />{t("issueExport.button")}
          </Button>
        ) : null}
      </div>
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
