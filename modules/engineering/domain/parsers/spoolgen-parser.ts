import { spoolgenIssue, type SpoolgenIssue } from "../spoolgen-issue"
import type { SpoolgenFileRole } from "../spoolgen-file"
import { SPOOLGEN_CONTRACT, numericKeysFor, requiredKeysFor, resolveColumns } from "../spoolgen-contract"
import { parseDelimited } from "./delimited"

export interface SpoolgenRecord { role: SpoolgenFileRole; lineNumber: number; values: Record<string, string> }
export interface SpoolgenParseResult { records: SpoolgenRecord[]; issues: SpoolgenIssue[] }
export function parseSpoolgenFile(role: SpoolgenFileRole, text: string): SpoolgenParseResult {
  const matrix = parseDelimited(text); const issues: SpoolgenIssue[] = []
  if (matrix.length === 0) return { records: [], issues: [spoolgenIssue("EMPTY_FILE", null, role)] }
  const { indexes, missingRequired } = resolveColumns(role, matrix[0])
  if (missingRequired.length > 0) return { records: [], issues: missingRequired.map((key) => spoolgenIssue("MISSING_COLUMN", null, key)) }
  const records: SpoolgenRecord[] = []
  for (let line = 1; line < matrix.length; line += 1) {
    const values: Record<string, string> = {}; for (const column of SPOOLGEN_CONTRACT[role]) values[column.key] = indexes.get(column.key) === undefined ? "" : matrix[line][indexes.get(column.key)!] ?? ""
    if (Object.values(values).every((value) => value === "")) continue
    for (const key of requiredKeysFor(role)) if (values[key] === "") issues.push(spoolgenIssue("MISSING_VALUE", line, key))
    for (const key of numericKeysFor(role)) if (values[key] !== "" && !Number.isFinite(Number(values[key]))) issues.push(spoolgenIssue("INVALID_NUMBER", line, key))
    records.push({ role, lineNumber: line, values })
  }
  return { records, issues }
}
