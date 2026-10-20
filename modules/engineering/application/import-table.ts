import type { TableTemplateSettings } from "../domain/import-template"
import { emptyFileSet } from "../domain/parsers/cross-file"
import { parseSpoolgenMatrix } from "../domain/parsers/spoolgen-parser"
import { SPOOLGEN_CONTRACT, normalizeHeader, resolveColumns } from "../domain/spoolgen-contract"
import { SPOOLGEN_FILE_ROLES, missingRequiredRoles, type SpoolgenFileRole } from "../domain/spoolgen-file"
import { spoolgenIssue, type SpoolgenIssue } from "../domain/spoolgen-issue"
import { buildSubmissionFromSet, type SpoolgenSubmission } from "./import-spooling"

/** One table file as read in the browser: the first sheet of a workbook, or the rows of a CSV or text file. */
export interface TableSource { role: SpoolgenFileRole; fileName: string; matrix: readonly (readonly unknown[])[] }
/** Per role, the required fields no column was found for, with the headers the file offers instead. */
export type MissingColumns = Partial<Record<SpoolgenFileRole, { key: string; headers: string[] }[]>>
export type TableSubmission = SpoolgenSubmission & { missingColumns: MissingColumns }
/** A contract field of the role and the header it is read from now, mapped or matched by name; null when none is. */
export interface TableColumnChoice { key: string; required: boolean; header: string | null }

const cellText = (cell: unknown): string => (cell === null || cell === undefined ? "" : String(cell).trim())
const headerRow = (source: TableSource): string[] => (source.matrix.length === 0 ? [] : source.matrix[0].map(cellText))
/** A header made only of signs (`№`, `--`) can never be matched, so it is not offered. */
const offeredHeaders = (row: readonly string[]): string[] => [...new Set(row.filter((header) => normalizeHeader(header) !== ""))]

/**
 * One upload of table files, read through the template's column map. Each record and issue names its file. Nothing is
 * sent without a weld file or while a required field has no column; every other problem is the server's to report.
 */
export function buildTableSubmission(sources: readonly TableSource[], settings: TableTemplateSettings): TableSubmission {
  const set = emptyFileSet(); const issues: SpoolgenIssue[] = []; const missingColumns: MissingColumns = {}
  const ordered = SPOOLGEN_FILE_ROLES.flatMap((role) => sources.filter((source) => source.role === role))
  for (const source of ordered) {
    const columnMap = settings.columns[source.role]
    const parsed = parseSpoolgenMatrix(source.role, source.matrix, columnMap)
    set[source.role] = [...set[source.role], ...parsed.records.map((record) => ({ ...record, fileName: source.fileName }))]
    issues.push(...parsed.issues.map((issue) => ({ ...issue, fileName: source.fileName })))
    const row = headerRow(source); const { missingRequired } = resolveColumns(source.role, row, columnMap)
    if (source.matrix.length > 0 && missingRequired.length > 0) missingColumns[source.role] = [...(missingColumns[source.role] ?? []), ...missingRequired.map((key) => ({ key, headers: offeredHeaders(row) }))]
  }
  const missingFiles = missingRequiredRoles(ordered.map((source) => source.role))
  for (const role of missingFiles) issues.push(spoolgenIssue("MISSING_REQUIRED_FILE", null, role))
  return { ...buildSubmissionFromSet(set, issues, missingFiles.length === 0 && Object.keys(missingColumns).length === 0), missingColumns }
}

/** Every contract field of the file's role, for the mapping editor, and the headers the file offers. */
export function describeTableColumns(source: TableSource, columnMap?: Readonly<Record<string, string>>): { headers: string[]; columns: TableColumnChoice[] } {
  const row = headerRow(source); const { indexes } = resolveColumns(source.role, row, columnMap)
  const columns = SPOOLGEN_CONTRACT[source.role].map((column) => { const index = indexes.get(column.key); return { key: column.key, required: column.required, header: index === undefined ? null : row[index] } })
  return { headers: offeredHeaders(row), columns }
}
