import { compareCodes, formatDocumentDate, type Cell, type DocumentLocale, type DocumentTable } from "./document"
import type { NdeRegisterRow, PunchRow, TestPackDocumentRow, WeldLogRow } from "./report"

export const WELD_LOG_COLUMNS = [
  "iso", "revision", "line", "spool", "weld", "location", "weldType", "diameter", "thickness", "wps",
  "welders", "weldedOn", "ndeMethods", "ndeStatus", "pwht", "heat", "testPack",
] as const

export const NDE_REGISTER_COLUMNS = [
  "iso", "spool", "weld", "location", "welders", "method", "selection", "disposition", "batch",
  "laboratory", "examinedOn", "outcome", "report", "defect", "testPack",
] as const

export const PUNCH_COLUMNS = [
  "testPack", "item", "iso", "spool", "code", "description", "checkingDate", "completionDate", "status",
] as const

export const TEST_PACK_SUMMARY_COLUMNS = [
  "testPack", "revision", "system", "subsystem", "medium", "testPressure", "isoCount", "welds", "openX",
  "rft", "rftOn", "testingStarted", "testingCompleted", "precommissioning",
] as const

export const ISO_COLUMNS = ["iso", "revision", "line"] as const

export const WELD_HISTORY_COLUMNS = [
  "iso", "spool", "weld", "location", "diameter", "thickness", "wps", "welders", "weldedOn", "ndeResult",
  "reports", "pwht", "heat",
] as const

export const DOCUMENT_COLUMNS = [
  ...new Set([
    ...WELD_LOG_COLUMNS, ...NDE_REGISTER_COLUMNS, ...PUNCH_COLUMNS, ...TEST_PACK_SUMMARY_COLUMNS,
    ...ISO_COLUMNS, ...WELD_HISTORY_COLUMNS,
  ]),
] as const

export type DocumentColumn =
  | (typeof WELD_LOG_COLUMNS)[number]
  | (typeof NDE_REGISTER_COLUMNS)[number]
  | (typeof PUNCH_COLUMNS)[number]
  | (typeof TEST_PACK_SUMMARY_COLUMNS)[number]
  | (typeof ISO_COLUMNS)[number]
  | (typeof WELD_HISTORY_COLUMNS)[number]

/** Every word a register prints, already in the reader's language; codes are keys, never shown raw. */
export interface RegisterLabels {
  locale: DocumentLocale
  columns: Record<DocumentColumn, string>
  location: Record<string, string>
  method: Record<string, string>
  selection: Record<string, string>
  disposition: Record<string, string>
  outcome: Record<string, string>
  ndeStatus: Record<"pending" | "rejected" | "done", string>
  pwht: Record<"required" | "accepted", string>
  punchStatus: Record<"open" | "closed", string>
  medium: Record<string, string>
  yes: string
  no: string
}

export function word(words: Record<string, string>, code: string | null): string | null {
  return code === null ? null : words[code] ?? code
}

export function list(values: readonly string[]): string | null {
  return values.length === 0 ? null : values.join(", ")
}

export function head(columns: readonly DocumentColumn[], labels: RegisterLabels): string[] {
  return columns.map((column) => labels.columns[column])
}

/** Words for the server's NDE counts: rejected wins over pending; no obligations prints nothing. */
function ndeStatus(row: WeldLogRow, labels: RegisterLabels): string | null {
  if (row.ndeRejected > 0) return labels.ndeStatus.rejected
  if (row.ndePending > 0) return labels.ndeStatus.pending
  return row.ndeMethods.length > 0 ? labels.ndeStatus.done : null
}

export function pwht(row: WeldLogRow, labels: RegisterLabels): string | null {
  if (!row.pwhtRequired) return null
  return row.pwhtAccepted ? labels.pwht.accepted : labels.pwht.required
}

export function byWeld(a: { isoNumber: string; spoolNumber: string; weldNumber: string }, b: typeof a): number {
  return compareCodes(a.isoNumber, b.isoNumber)
    || compareCodes(a.spoolNumber, b.spoolNumber)
    || compareCodes(a.weldNumber, b.weldNumber)
}

export function weldLogTable(rows: readonly WeldLogRow[], labels: RegisterLabels): DocumentTable {
  const body: Cell[][] = [...rows].sort(byWeld).map((row) => [
    row.isoNumber,
    row.revisionNumber,
    row.lineNumber,
    row.spoolNumber,
    row.weldNumber,
    word(labels.location, row.weldLocation),
    row.weldTypeCode,
    row.diameterInch,
    row.thicknessMm,
    row.wpsCode,
    list(row.welderCodes),
    formatDocumentDate(row.weldOn, labels.locale),
    list(row.ndeMethods.map((method) => labels.method[method] ?? method)),
    ndeStatus(row, labels),
    pwht(row, labels),
    list(row.traceNumbers),
    row.testPackNumber,
  ])
  return { head: head(WELD_LOG_COLUMNS, labels), body }
}

export function ndeRegisterTable(rows: readonly NdeRegisterRow[], labels: RegisterLabels): DocumentTable {
  const body: Cell[][] = [...rows]
    .sort((a, b) => byWeld(a, b) || compareCodes(a.method, b.method))
    .map((row) => [
      row.isoNumber,
      row.spoolNumber,
      row.weldNumber,
      word(labels.location, row.weldLocation),
      list(row.welderCodes),
      word(labels.method, row.method),
      `${word(labels.selection, row.selectionMode)} ${row.requiredCoverage}%`,
      word(labels.disposition, row.disposition),
      row.batchNumber,
      row.ndtSubcontractorName,
      formatDocumentDate(row.examinedOn, labels.locale),
      word(labels.outcome, row.outcome),
      row.reportNumber,
      row.defectCode,
      row.testPackNumber,
    ])
  return { head: head(NDE_REGISTER_COLUMNS, labels), body }
}

export function punchTable(rows: readonly PunchRow[], labels: RegisterLabels): DocumentTable {
  const body: Cell[][] = [...rows]
    .sort((a, b) => compareCodes(a.testPackNumber, b.testPackNumber) || compareCodes(a.itemNumber, b.itemNumber))
    .map((row) => [
      row.testPackNumber,
      row.itemNumber,
      row.isoNumber,
      row.spoolNumber,
      row.punchCode,
      row.description,
      formatDocumentDate(row.checkingDate, labels.locale),
      formatDocumentDate(row.completionDate, labels.locale),
      row.completionDate ? labels.punchStatus.closed : labels.punchStatus.open,
    ])
  return { head: head(PUNCH_COLUMNS, labels), body }
}

export function testPackSummaryTable(rows: readonly TestPackDocumentRow[], labels: RegisterLabels): DocumentTable {
  const body: Cell[][] = [...rows]
    .sort((a, b) => compareCodes(a.testPackNumber, b.testPackNumber))
    .map((row) => [
      row.testPackNumber,
      row.revisionNo,
      [row.systemCode, row.systemDescription].filter(Boolean).join(" — "),
      [row.subsystemCode, row.subsystemDescription].filter(Boolean).join(" — "),
      word(labels.medium, row.testMedium),
      `${row.testPressure} ${row.pressureUnit}`,
      row.isoCount,
      `${row.weldDone} / ${row.weldTotal}`,
      row.openXCount,
      row.isRft ? labels.yes : labels.no,
      formatDocumentDate(row.rftOn, labels.locale),
      formatDocumentDate(row.testingStartedOn, labels.locale),
      formatDocumentDate(row.testingCompletedOn, labels.locale),
      formatDocumentDate(row.precommissioningCompletedOn, labels.locale),
    ])
  return { head: head(TEST_PACK_SUMMARY_COLUMNS, labels), body }
}
