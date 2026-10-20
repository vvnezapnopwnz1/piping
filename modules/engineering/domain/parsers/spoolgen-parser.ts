import { spoolgenIssue, type SpoolgenIssue } from "../spoolgen-issue"
import type { SpoolgenFileRole } from "../spoolgen-file"
import { SPOOLGEN_CONTRACT, numericKeysFor, requiredKeysFor, resolveColumns, type SpoolgenColumn } from "../spoolgen-contract"
import { parseDelimited } from "./delimited"

export interface SpoolgenRecord { role: SpoolgenFileRole; lineNumber: number; fileName: string | null; values: Record<string, string> }
export interface SpoolgenParseResult { records: SpoolgenRecord[]; issues: SpoolgenIssue[] }
const WELD_LOCATIONS = new Map([["цех", "shop"], ["заводской", "shop"], ["shop", "shop"], ["s", "shop"], ["монтаж", "field"], ["монтажный", "field"], ["field", "field"], ["f", "field"], ["site", "field"], ["assembly", "assembly"]])
const cellText = (cell: unknown): string => (cell === null || cell === undefined ? "" : String(cell).trim())
// A decimal comma becomes a point in numeric columns; a weld location is spelled the way the server stores it. Anything else passes through for the server to judge.
function normalizeCell(column: SpoolgenColumn, value: string): string {
  if (column.numeric && /^-?\d+,\d+$/.test(value)) return value.replace(",", ".")
  if (column.key === "weld_location") return WELD_LOCATIONS.get(value.toLowerCase()) ?? value
  return value
}
export function parseSpoolgenMatrix(role: SpoolgenFileRole, matrix: readonly (readonly unknown[])[], columnMap?: Readonly<Record<string, string>>): SpoolgenParseResult {
  const issues: SpoolgenIssue[] = []
  if (matrix.length === 0) return { records: [], issues: [spoolgenIssue("EMPTY_FILE", null, role)] }
  const { indexes, missingRequired } = resolveColumns(role, matrix[0].map(cellText), columnMap)
  if (missingRequired.length > 0) return { records: [], issues: missingRequired.map((key) => spoolgenIssue("MISSING_COLUMN", null, key)) }
  const records: SpoolgenRecord[] = []
  for (let line = 1; line < matrix.length; line += 1) {
    const values: Record<string, string> = {}; for (const column of SPOOLGEN_CONTRACT[role]) values[column.key] = indexes.get(column.key) === undefined ? "" : normalizeCell(column, cellText(matrix[line][indexes.get(column.key)!]))
    if (Object.values(values).every((value) => value === "")) continue
    for (const key of requiredKeysFor(role)) if (values[key] === "") issues.push(spoolgenIssue("MISSING_VALUE", line, key))
    for (const key of numericKeysFor(role)) if (values[key] !== "" && !Number.isFinite(Number(values[key]))) issues.push(spoolgenIssue("INVALID_NUMBER", line, key))
    records.push({ role, lineNumber: line, fileName: null, values })
  }
  return { records, issues }
}
export function parseSpoolgenFile(role: SpoolgenFileRole, text: string, columnMap?: Readonly<Record<string, string>>): SpoolgenParseResult { return parseSpoolgenMatrix(role, parseDelimited(text), columnMap) }
