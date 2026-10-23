import type { SpoolingTranslator } from "@/modules/imports/ui/spooling-translator"
import type { IssueEntry } from "../application/issue-entries"
import { describeIssueEntry, formatRowRanges } from "./issue-entry-text"

/**
 * The error list as rows for a workbook (manual 6.1: the user can export the error file): the same entries the screen
 * shows, one row each, in the person's language, with the rows written out in full where the screen shortens them.
 */
export function issueEntriesRows(t: SpoolingTranslator, entries: readonly IssueEntry[]): (string | number)[][] {
  return [
    [t("issueExport.severity"), t("issueExport.problem"), t("issueExport.place"), t("issueExport.column"), t("issueExport.rows")],
    ...entries.map((entry) => [
      t(`severity.${entry.severity}`),
      describeIssueEntry(t, entry),
      (entry.place.sheet ? t("issuePlace.sheet", { sheet: entry.place.sheet }) : entry.place.file) ?? "",
      entry.place.column ?? "",
      formatRowRanges(entry.place.rows, Number.POSITIVE_INFINITY).text,
    ]),
  ]
}
