import { emptyFileSet } from "../domain/parsers/cross-file"
import { parseSpoolgenMatrix } from "../domain/parsers/spoolgen-parser"
import { SPOOLGEN_CONTRACT } from "../domain/spoolgen-contract"
import { SPOOLGEN_FILE_ROLES, addPickedFiles, missingRequiredRoles, type SpoolgenFileRole } from "../domain/spoolgen-file"
import { spoolgenIssue, type SpoolgenIssue } from "../domain/spoolgen-issue"
import { buildSubmissionFromSet, type SpoolgenSubmission } from "./import-spooling"

/**
 * One table file as read in the browser: a sheet of a workbook, or the rows of a text file. A workbook sheet names
 * itself and carries the Excel row number of each matrix row, so records and issues point at the row a person sees.
 */
export interface TableSource { role: SpoolgenFileRole; fileName: string; matrix: readonly (readonly unknown[])[]; sheet?: string; rowNumbers?: readonly number[] }
/** Per role, the required fields no column was found for, by contract key. */
export type MissingColumns = Partial<Record<SpoolgenFileRole, string[]>>
export type TableSubmission = SpoolgenSubmission & { missingColumns: MissingColumns }

/**
 * One upload of table files, read by the fixed contract: a column is found by its template header or an alias. Each
 * record and issue names its file. Nothing is sent without a weld file; a missing required column is listed and left to
 * the server to report, and a workbook upload stops on it before sending (`readWorkbookUpload`).
 */
export function buildTableSubmission(sources: readonly TableSource[]): TableSubmission {
  const set = emptyFileSet(); const issues: SpoolgenIssue[] = []; const missingColumns: MissingColumns = {}
  const ordered = SPOOLGEN_FILE_ROLES.flatMap((role) => sources.filter((source) => source.role === role))
  for (const source of ordered) {
    const parsed = parseSpoolgenMatrix(source.role, source.matrix)
    const line = (index: number) => source.rowNumbers?.[index] ?? index
    const sheet = source.sheet === undefined ? {} : { sheet: source.sheet }
    set[source.role] = [...set[source.role], ...parsed.records.map((record) => ({ ...record, ...sheet, lineNumber: line(record.lineNumber), fileName: source.fileName }))]
    issues.push(...parsed.issues.map((issue) => ({ ...issue, rowNumber: issue.rowNumber === null ? null : line(issue.rowNumber), fileName: source.fileName, role: source.role })))
    const missing = parsed.issues.flatMap((issue) => (issue.code === "MISSING_COLUMN" && issue.columnName !== null ? [issue.columnName] : []))
    if (missing.length > 0) missingColumns[source.role] = [...(missingColumns[source.role] ?? []), ...missing]
  }
  const missingFiles = missingRequiredRoles(ordered.map((source) => source.role))
  for (const role of missingFiles) issues.push(spoolgenIssue("MISSING_REQUIRED_FILE", null, role))
  return { ...buildSubmissionFromSet(set, issues, missingFiles.length === 0), missingColumns }
}

/** What one picked workbook gives: nothing to send without a weld sheet or with a required column missing, else the submission. */
export type WorkbookReading =
  | { kind: "noWeldSheet" }
  | { kind: "missingColumns"; sheets: { sheet: SpoolgenFileRole; headers: string[] }[] }
  | { kind: "ready"; submission: SpoolgenSubmission }

/**
 * One workbook upload: each role reads its own sheet, the weld sheet is required, and an optional sheet with no rows is
 * left out as if it were not there. A missing required column is named by its template header, so the person can fix
 * the file before anything is sent.
 */
export function readWorkbookUpload(fileName: string, sheets: Partial<Record<SpoolgenFileRole, { rows: readonly (readonly unknown[])[]; rowNumbers: readonly number[] }>>): WorkbookReading {
  if ((sheets.weld?.rows.length ?? 0) === 0) return { kind: "noWeldSheet" }
  const sources = SPOOLGEN_FILE_ROLES.flatMap((role): TableSource[] => {
    const sheet = sheets[role]
    return sheet === undefined || sheet.rows.length === 0 ? [] : [{ role, fileName, sheet: role, matrix: sheet.rows, rowNumbers: sheet.rowNumbers }]
  })
  const { missingColumns, ...submission } = buildTableSubmission(sources)
  const missing = SPOOLGEN_FILE_ROLES.flatMap((role) => {
    const keys = new Set(missingColumns[role])
    return keys.size === 0 ? [] : [{ sheet: role, headers: SPOOLGEN_CONTRACT[role].filter((column) => keys.has(column.key)).map((column) => column.canonicalHeader) }]
  })
  return missing.length > 0 ? { kind: "missingColumns", sheets: missing } : { kind: "ready", submission }
}

/**
 * A file picked for a role: it takes the role's slot, and `replaced` is the file it pushed out, so the loss can be shown.
 * A refused file (empty, over the size limit) takes nothing and replaces nothing. Files held by the other roles count
 * toward the limit of one upload; the file of this role does not, as it is about to be replaced.
 */
export function pickTableFile<T extends { name: string; size: number }>(role: SpoolgenFileRole, held: T | undefined, picked: T, othersHeld: number) {
  const { files, refused, overLimit } = addPickedFiles(role, [], [picked], othersHeld)
  const taken = files.find((file) => file === picked)
  return { taken, replaced: taken === undefined ? undefined : held, refused, overLimit }
}
