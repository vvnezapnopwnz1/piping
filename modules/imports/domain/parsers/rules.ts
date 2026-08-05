import { getImportTypeDefinition, type ImportType } from "../import-type"
import type { ImportIssue } from "../import-issue"
import type { ParsedRow } from "./registry"

const WELD_LOCATIONS = new Set(["shop", "assembly", "field"])

const COVERAGE_KEYS = [
  "rt_coverage",
  "ut_coverage",
  "mt_coverage",
  "pt_coverage",
  "pmi_coverage",
  "ht_coverage",
] as const

function numberAt(row: ParsedRow, key: string): number | null {
  const value = row.normalizedValues[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function checkRange(
  row: ParsedRow,
  fromKey: string,
  toKey: string,
  label: string,
  issues: ImportIssue[]
): void {
  const from = numberAt(row, fromKey)
  const to = numberAt(row, toKey)
  if (from === null || to === null) return
  if (to < from) {
    issues.push({
      rowNumber: row.rowNumber,
      columnName: toKey,
      severity: "blocker",
      code: "INVALID_RANGE",
      message: `${label} "to" must be greater than or equal to "from".`,
    })
  }
}

function checkPositive(row: ParsedRow, key: string, label: string, issues: ImportIssue[]): void {
  const value = numberAt(row, key)
  if (value === null) return
  if (value <= 0) {
    issues.push({
      rowNumber: row.rowNumber,
      columnName: key,
      severity: "blocker",
      code: "OUT_OF_RANGE",
      message: `${label} must be greater than zero.`,
    })
  }
}

function checkDuplicateNaturalKeys(
  importType: ImportType,
  rows: readonly ParsedRow[],
  issues: ImportIssue[]
): void {
  const naturalKey = getImportTypeDefinition(importType).naturalKey
  const seen = new Set<string>()

  for (const row of rows) {
    const parts = naturalKey.map((key) => String(row.normalizedValues[key] ?? ""))
    if (parts.some((part) => part === "")) continue
    const composite = parts.join(" ")
    if (seen.has(composite)) {
      issues.push({
        rowNumber: row.rowNumber,
        columnName: naturalKey[0],
        severity: "blocker",
        code: "DUPLICATE_IN_FILE",
        message: `This ${naturalKey.join(" + ")} appears more than once in the file.`,
      })
      continue
    }
    seen.add(composite)
  }
}

export function applyTypeRules(
  importType: ImportType,
  rows: readonly ParsedRow[]
): ImportIssue[] {
  const issues: ImportIssue[] = []

  for (const row of rows) {
    if (importType === "welding_procedure") {
      checkRange(row, "diameter_from_inch", "diameter_to_inch", "Diameter", issues)
      checkRange(row, "thickness_from_mm", "thickness_to_mm", "Thickness", issues)
    }

    if (importType === "thickness_flange") {
      checkPositive(row, "diameter_inch", "Dia Inch", issues)
      checkPositive(row, "thickness_mm", "Thickness", issues)
    }

    if (importType === "nde_matrix") {
      const location = row.normalizedValues.weld_location
      if (typeof location === "string" && location !== "" && !WELD_LOCATIONS.has(location)) {
        issues.push({
          rowNumber: row.rowNumber,
          columnName: "weld_location",
          severity: "blocker",
          code: "INVALID_VALUE",
          message: 'Weld Location must be one of "shop", "assembly" or "field".',
        })
      }
      for (const key of COVERAGE_KEYS) {
        const value = numberAt(row, key)
        if (value === null) continue
        if (value < 0 || value > 100) {
          issues.push({
            rowNumber: row.rowNumber,
            columnName: key,
            severity: "blocker",
            code: "OUT_OF_RANGE",
            message: "Coverage must be between 0 and 100.",
          })
        }
      }
    }

    if (importType === "flange_progress") {
      checkPositive(row, "jointing_value", "Jointing Value", issues)
      const date = row.normalizedValues.joint_date
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
        issues.push({ rowNumber: row.rowNumber, columnName: "joint_date", severity: "blocker", code: "INVALID_DATE", message: "Joint Date must be a valid YYYY-MM-DD date." })
      }
      const jointerCodes = row.normalizedValues.jointer_codes
      if (Array.isArray(jointerCodes)) {
        const seen = new Set<string>()
        for (const code of jointerCodes) {
          const key = String(code).toUpperCase()
          if (seen.has(key)) issues.push({ rowNumber: row.rowNumber, columnName: "jointer_codes", severity: "blocker", code: "DUPLICATE_JOINTER", message: "Jointer Codes must not repeat a jointer." })
          seen.add(key)
        }
      }
      issues.push({ rowNumber: row.rowNumber, columnName: "jointing_value", severity: "warning", code: "UT_CONFIGURATION_WARNING", message: "UT is calculated by the server from the active project configuration." })
    }
  }

  checkDuplicateNaturalKeys(importType, rows, issues)

  return issues
}
