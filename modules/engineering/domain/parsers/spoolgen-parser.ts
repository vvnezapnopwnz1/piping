import type { ImportIssue } from "@/modules/imports/domain/import-issue"
import type { SpoolgenFileRole } from "../spoolgen-file"
import { SPOOLGEN_CONTRACT, numericKeysFor, requiredKeysFor, resolveColumns } from "../spoolgen-contract"
import { parseDelimited } from "./delimited"

export interface SpoolgenRecord { role: SpoolgenFileRole; lineNumber: number; values: Record<string, string> }
export interface SpoolgenParseResult { records: SpoolgenRecord[]; issues: ImportIssue[] }
export function parseSpoolgenFile(role: SpoolgenFileRole, text: string): SpoolgenParseResult {
  const matrix = parseDelimited(text); const issues: ImportIssue[] = []
  if (matrix.length === 0) return { records: [], issues: [{ rowNumber: null, columnName: role, severity: "blocker", code: "EMPTY_FILE", message: `${role}.txt contains no rows.` }] }
  const { indexes, missingRequired } = resolveColumns(role, matrix[0])
  if (missingRequired.length > 0) return { records: [], issues: missingRequired.map((key) => ({ rowNumber: null, columnName: key, severity: "blocker" as const, code: "MISSING_COLUMN", message: `${role}.txt is missing the required column "${SPOOLGEN_CONTRACT[role].find((column) => column.key === key)?.canonicalHeader ?? key}".` })) }
  const records: SpoolgenRecord[] = []
  for (let line = 1; line < matrix.length; line += 1) {
    const values: Record<string, string> = {}; for (const column of SPOOLGEN_CONTRACT[role]) values[column.key] = indexes.get(column.key) === undefined ? "" : matrix[line][indexes.get(column.key)!] ?? ""
    if (Object.values(values).every((value) => value === "")) continue
    for (const key of requiredKeysFor(role)) if (values[key] === "") issues.push({ rowNumber: line, columnName: key, severity: "blocker", code: "MISSING_VALUE", message: `${role}.txt row ${line}: "${key}" is required.` })
    for (const key of numericKeysFor(role)) if (values[key] !== "" && !Number.isFinite(Number(values[key]))) issues.push({ rowNumber: line, columnName: key, severity: "blocker", code: "INVALID_NUMBER", message: `${role}.txt row ${line}: "${values[key]}" is not a number.` })
    records.push({ role, lineNumber: line, values })
  }
  return { records, issues }
}
