import type { SpoolingTranslator } from "@/modules/imports/ui/spooling-translator"
import type { IssueEntry, IssuePlace } from "../application/issue-entries"
import { isSpoolgenIssueCode, isSpoolingServerIssueCode } from "../domain/spoolgen-issue"

/** At most this many ranges are written out, so an entry over thousands of rows stays one line. */
const MAX_RANGES = 10

/** Rows as ranges, `2–41, 45`; past ten ranges, `more` is how many rows were left unwritten. */
export function formatRowRanges(rows: readonly number[]): { text: string; more: number } {
  const ranges: [number, number][] = []
  for (const row of [...new Set(rows)].sort((a, b) => a - b)) {
    const last = ranges.at(-1)
    if (last !== undefined && row === last[1] + 1) last[1] = row
    else ranges.push([row, row])
  }
  const more = ranges.slice(MAX_RANGES).reduce((sum, [from, to]) => sum + to - from + 1, 0)
  return { text: ranges.slice(0, MAX_RANGES).map(([from, to]) => (from === to ? String(from) : `${from}–${to}`)).join(", "), more }
}

/** The entry's sentence. A code the app does not know comes from the server and keeps its own sentence. */
export function describeIssueEntry(t: SpoolingTranslator, entry: IssueEntry): string {
  if (!isSpoolgenIssueCode(entry.code) && !isSpoolingServerIssueCode(entry.code)) return entry.message
  return t(`issueTitles.${entry.code}`, entry.args)
}

/** Where the entry is, as Excel shows it: `Sheet weld, column PDS_AREA, rows 2–41, 45`; a text or PCF file is named instead of a sheet. */
export function describeIssuePlace(t: SpoolingTranslator, place: IssuePlace): string {
  const { text, more } = formatRowRanges(place.rows)
  const rows = place.rows.length === 0 ? null : t("issuePlace.rows", { several: place.rows.length > 1 ? "yes" : "no", list: text }) + (more > 0 ? ` ${t("issuePlace.more", { count: more })}` : "")
  return [place.sheet ? t("issuePlace.sheet", { sheet: place.sheet }) : place.file, place.column ? t("issuePlace.column", { column: place.column }) : null, rows].filter(Boolean).join(", ")
}
