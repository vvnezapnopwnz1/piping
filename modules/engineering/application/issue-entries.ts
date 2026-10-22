import type { ImportIssueSeverity } from "@/modules/imports/domain/import-issue"
import type { StoredImportIssue } from "@/modules/imports/domain/stored-import-issue"
import type { SpoolgenRecord } from "../domain/parsers/spoolgen-parser"
import { SPOOLGEN_CONTRACT } from "../domain/spoolgen-contract"
import { SPOOLGEN_FILE_ROLES, type SpoolgenFileRole } from "../domain/spoolgen-file"
import { FILE_CODES, isSpoolgenIssueCode } from "../domain/spoolgen-issue"
import type { SpoolgenSubmission } from "./import-spooling"

/** Where an entry points: a workbook sheet or else a file, the template column, and the rows as that sheet or file numbers them. */
export interface IssuePlace { sheet: string | null; file: string | null; column: string | null; rows: readonly number[] }
/**
 * One reason, listed once: the code, the values its sentence names, the stored sentence (shown only for a code the app
 * does not know), and where. Issues with the same reason in the same column of one sheet become one entry.
 */
export interface IssueEntry { severity: ImportIssueSeverity; code: string; args: Readonly<Record<string, string | number>>; message: string; place: IssuePlace }

type Issue = Pick<StoredImportIssue, "rowNumber" | "columnName" | "severity" | "code" | "message" | "fileName"> & { role?: SpoolgenFileRole }

/** A server check that repeats one the browser makes, under the browser's code. Both group the welds by isometric. */
const TWINS: Readonly<Record<string, string>> = { SRV_ORPHAN_SPOOL: "ORPHAN_SPOOL", SRV_ISO_MIXED_LINE: "ISO_MIXED_LINE", SRV_ISO_MIXED_SERVICE_CLASS: "ISO_MIXED_SERVICE_CLASS" }
const ISO_CODES = new Set(["ISO_MIXED_LINE", "ISO_MIXED_SERVICE_CLASS", "ISO_MIXED_REVISION"])
const SEVERITY_ORDER: Record<ImportIssueSeverity, number> = { blocker: 0, conflict: 1, warning: 2 }

const recordKey = (role: string | undefined, fileName: string | null, line: number | null) => `${role ?? ""}|${fileName ?? ""}|${line ?? ""}`
const value = (values: Readonly<Record<string, string>>, key: string) => values[key] ?? ""
/** The header the template gives a field, so the place names the column a person sees. */
const headerOf = (role: SpoolgenFileRole, key: string | null) => (key === null ? null : SPOOLGEN_CONTRACT[role].find((column) => column.key === key)?.canonicalHeader ?? key)

/** The values a code's sentence names, read from the row the issue points at: the sent row for the server, the record for the browser. */
function argsFor(code: string, values: Readonly<Record<string, string>>, key: string | null, column: string | null, weldCount: number): Record<string, string | number> {
  switch (code) {
    case "SRV_PDS_MISSING": return { pdsArea: value(values, "pds_area") }
    case "SRV_SERVICE_CLASS_MISSING": return { serviceClass: value(values, "service_class") }
    case "SRV_WELD_TYPE_MISSING": return { weldType: value(values, "weld_type") }
    case "SRV_THICKNESS_MISSING": return { serviceClass: value(values, "service_class"), diameter: value(values, "diameter_inch") }
    case "SRV_NDE_MATRIX_MISSING": return { serviceClass: value(values, "service_class"), weldType: value(values, "weld_type"), location: value(values, "weld_location") }
    // The thickness the server took from a rule is not in the sent row; then the sentence names the diameter alone.
    case "SRV_WPS_MISSING": return { diameter: value(values, "diameter_inch"), thickness: value(values, "thickness_mm"), hasThickness: value(values, "thickness_mm") === "" ? "no" : "yes" }
    case "ORPHAN_SPOOL": return { iso: value(values, "iso_number"), spool: value(values, "spool_number") }
    case "ISO_MIXED_LINE": case "ISO_MIXED_SERVICE_CLASS": case "ISO_MIXED_REVISION": return { iso: value(values, "iso_number") }
    case "MISSING_VALUE": case "MISSING_COLUMN": return { column: column ?? "" }
    case "INVALID_NUMBER": return { column: column ?? "", value: key === null ? "" : value(values, key) }
    // The limit is the server's; the screen names how many welds this upload sent, the number the server compares.
    case "SRV_SPOOLING_JOB_TOO_LARGE": return { count: weldCount }
    default: return {}
  }
}

/**
 * The list a person reads after a check: the browser's issues (`submission.issues`, which carry the role of their record)
 * and the server's (`stored` codes the browser does not make). The stored copies of the browser's issues are the same
 * issues without a role, so they are not read. A server issue points at a sent row and so at the records it is built
 * from; a server twin with no row is left out when the browser reported the same code.
 */
export function buildIssueEntries(submission: SpoolgenSubmission, stored: readonly StoredImportIssue[]): IssueEntry[] {
  const records = new Map<string, SpoolgenRecord>()
  for (const record of submission.rowSources.flat()) { const key = recordKey(record.role, record.fileName, record.lineNumber); if (!records.has(key)) records.set(key, record) }
  const welds = [...records.values()].filter((record) => record.role === "weld")
  const sentRows = new Map(submission.rows.map((row, index) => [row.rowNumber, index]))
  const weldCount = submission.rows.filter((row) => row.normalizedValues.entity_type === "weld_joint").length
  const browserCodes = new Set<string>(submission.issues.map((issue) => issue.code))
  const entries: IssueEntry[] = []

  const add = (issue: Issue, code: string, sources: readonly SpoolgenRecord[], values: Readonly<Record<string, string>>) => {
    const groups = new Map<string, SpoolgenRecord[]>()
    for (const record of sources) { const key = `${record.sheet ?? ""}|${record.sheet ? "" : record.fileName ?? ""}`; const group = groups.get(key); if (group) group.push(record); else groups.set(key, [record]) }
    for (const group of groups.values()) {
      const first = group[0]; const column = headerOf(first.role, issue.columnName)
      entries.push({ severity: issue.severity, code, args: argsFor(code, values, issue.columnName, column, weldCount), message: issue.message, place: { sheet: first.sheet ?? null, file: first.sheet ? null : first.fileName, column, rows: group.map((record) => record.lineNumber) } })
    }
  }
  const addUnplaced = (issue: Issue, code: string, place: IssuePlace) => entries.push({ severity: issue.severity, code, args: argsFor(code, {}, issue.columnName, place.column, weldCount), message: issue.message, place })

  for (const issue of submission.issues) {
    if (FILE_CODES.has(issue.code)) { addUnplaced(issue, issue.code, { sheet: null, file: issue.fileName, column: null, rows: [] }); continue }
    const record = records.get(recordKey(issue.role, issue.fileName, issue.rowNumber))
    if (record === undefined) {
      addUnplaced(issue, issue.code, { sheet: null, file: issue.fileName, column: issue.role === undefined ? null : headerOf(issue.role, issue.columnName), rows: issue.rowNumber === null ? [] : [issue.rowNumber] })
      continue
    }
    const sources = ISO_CODES.has(issue.code) ? welds.filter((weld) => weld.values.iso_number === record.values.iso_number) : [record]
    add(issue, issue.code, sources, record.values)
  }
  for (const issue of stored) {
    if (isSpoolgenIssueCode(issue.code)) continue
    const twin = TWINS[issue.code]
    const index = issue.rowNumber === null ? undefined : sentRows.get(issue.rowNumber)
    if (index === undefined) {
      if (twin !== undefined && browserCodes.has(twin)) continue
      addUnplaced(issue, issue.code, { sheet: null, file: null, column: null, rows: [] })
      continue
    }
    add(issue, twin ?? issue.code, submission.rowSources[index] ?? [], submission.rows[index].normalizedValues)
  }
  return order(merge(entries))
}

/**
 * Entries with the same reason in the same place become one, their rows joined, sorted and each once. The rows are
 * gathered first and sorted once: a job of thousands of welds can give one entry per weld.
 */
function merge(entries: readonly IssueEntry[]): IssueEntry[] {
  const merged = new Map<string, { entry: IssueEntry; rows: Set<number> }>()
  for (const entry of entries) {
    const key = JSON.stringify([entry.severity, entry.code, entry.place.sheet, entry.place.file, entry.place.column, entry.args])
    const found = merged.get(key)
    if (found) for (const row of entry.place.rows) found.rows.add(row)
    else merged.set(key, { entry, rows: new Set(entry.place.rows) })
  }
  return [...merged.values()].map(({ entry, rows }) => ({ ...entry, place: { ...entry.place, rows: [...rows].sort((a, b) => a - b) } }))
}

/** Errors, then overwrites, then warnings; within each, whole-upload entries first, then by sheet, file and first row. */
function order(entries: readonly IssueEntry[]): IssueEntry[] {
  const sheetRank = (sheet: string | null) => { const index = SPOOLGEN_FILE_ROLES.indexOf(sheet as SpoolgenFileRole); return index < 0 ? SPOOLGEN_FILE_ROLES.length : index }
  return [...entries].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    || Number(a.place.rows.length > 0) - Number(b.place.rows.length > 0)
    || sheetRank(a.place.sheet) - sheetRank(b.place.sheet)
    || (a.place.file ?? "").localeCompare(b.place.file ?? "")
    || (a.place.rows[0] ?? 0) - (b.place.rows[0] ?? 0))
}

/** What the summary line counts: the entries, not the rows behind them. */
export function countIssueEntries(entries: readonly IssueEntry[]): { errors: number; warnings: number } {
  return { errors: entries.filter((entry) => entry.severity === "blocker").length, warnings: entries.filter((entry) => entry.severity === "warning").length }
}
