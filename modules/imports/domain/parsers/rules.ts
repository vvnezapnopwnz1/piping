import { getImportTypeDefinition, type ImportType } from "../import-type"
import type { ImportRowIssue } from "../import-issue"
import type { ParsedRow } from "./registry"

const WELD_LOCATIONS = ["shop", "assembly", "field"] as const

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
  range: "diameter" | "thickness",
  issues: ImportRowIssue[]
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
      range,
    })
  }
}

function checkPositive(row: ParsedRow, key: string, issues: ImportRowIssue[]): void {
  const value = numberAt(row, key)
  if (value === null) return
  if (value <= 0) {
    issues.push({
      rowNumber: row.rowNumber,
      columnName: key,
      severity: "blocker",
      code: "OUT_OF_RANGE",
      bound: "positive",
    })
  }
}

function checkDuplicateNaturalKeys(
  importType: ImportType,
  rows: readonly ParsedRow[],
  issues: ImportRowIssue[]
): void {
  if (importType === "tracking_scan") return
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
        keys: naturalKey,
      })
      continue
    }
    seen.add(composite)
  }
}

function checkIsoDate(row: ParsedRow, key: string, issues: ImportRowIssue[]): void {
  const value = row.normalizedValues[key]
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    issues.push({ rowNumber: row.rowNumber, columnName: key, severity: "blocker", code: "INVALID_DATE" })
    return
  }
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    issues.push({ rowNumber: row.rowNumber, columnName: key, severity: "blocker", code: "INVALID_DATE" })
  }
}

function checkCompositionRules(rows: readonly ParsedRow[], issues: ImportRowIssue[]): void {
  const metadataKeys = [
    "system", "subsystem", "test_pack_revision", "test_medium", "test_pressure",
    "planned_start_on", "planned_end_on", "priority", "service_class", "line_service",
    "volume_m3", "test_pack_location",
  ]
  const firstByPack = new Map<string, ParsedRow>()

  for (const row of rows) {
    const medium = row.normalizedValues.test_medium
    if (typeof medium === "string" && !["H", "P", "V"].includes(medium)) {
      issues.push({ rowNumber: row.rowNumber, columnName: "test_medium", severity: "blocker", code: "INVALID_VALUE", expected: ["H", "P", "V"] })
    }
    checkPositive(row, "test_pressure", issues)
    checkPositive(row, "volume_m3", issues)
    checkIsoDate(row, "planned_start_on", issues)
    checkIsoDate(row, "planned_end_on", issues)
    const start = row.normalizedValues.planned_start_on
    const end = row.normalizedValues.planned_end_on
    if (typeof start === "string" && typeof end === "string" && end < start) {
      issues.push({ rowNumber: row.rowNumber, columnName: "planned_end_on", severity: "blocker", code: "INVALID_RANGE", range: "plannedDates" })
    }

    const packNumber = String(row.normalizedValues.test_pack_number ?? "")
    if (!packNumber) continue
    const first = firstByPack.get(packNumber)
    if (!first) {
      firstByPack.set(packNumber, row)
      continue
    }
    for (const key of metadataKeys) {
      if (String(first.normalizedValues[key] ?? "") !== String(row.normalizedValues[key] ?? "")) {
        issues.push({ rowNumber: row.rowNumber, columnName: key, severity: "blocker", code: "INCONSISTENT_TEST_PACK_METADATA" })
      }
    }
  }
}

export function applyTypeRules(
  importType: ImportType,
  rows: readonly ParsedRow[]
): ImportRowIssue[] {
  const issues: ImportRowIssue[] = []

  for (const row of rows) {
    if (importType === "welding_procedure") {
      checkRange(row, "diameter_from_inch", "diameter_to_inch", "diameter", issues)
      checkRange(row, "thickness_from_mm", "thickness_to_mm", "thickness", issues)
    }

    if (importType === "thickness_flange") {
      checkPositive(row, "diameter_inch", issues)
      checkPositive(row, "thickness_mm", issues)
    }

    if (importType === "nde_matrix") {
      const location = row.normalizedValues.weld_location
      if (typeof location === "string" && location !== "" && !(WELD_LOCATIONS as readonly string[]).includes(location)) {
        issues.push({
          rowNumber: row.rowNumber,
          columnName: "weld_location",
          severity: "blocker",
          code: "INVALID_VALUE",
          expected: WELD_LOCATIONS,
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
            bound: "percent",
          })
        }
      }
    }

    if (importType === "flange_progress") {
      checkPositive(row, "jointing_value", issues)
      const date = row.normalizedValues.joint_date
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
        issues.push({ rowNumber: row.rowNumber, columnName: "joint_date", severity: "blocker", code: "INVALID_DATE" })
      }
      const jointerCodes = row.normalizedValues.jointer_codes
      if (Array.isArray(jointerCodes)) {
        const seen = new Set<string>()
        for (const code of jointerCodes) {
          const key = String(code).toUpperCase()
          if (seen.has(key)) issues.push({ rowNumber: row.rowNumber, columnName: "jointer_codes", severity: "blocker", code: "DUPLICATE_JOINTER" })
          seen.add(key)
        }
      }
      issues.push({ rowNumber: row.rowNumber, columnName: "jointing_value", severity: "warning", code: "UT_CONFIGURATION_WARNING" })
    }

    if (importType === "test_pack_composition") {
      // Row-level checks and cross-row metadata consistency run after parsing.
    }
  }

  checkDuplicateNaturalKeys(importType, rows, issues)
  if (importType === "test_pack_composition") checkCompositionRules(rows, issues)

  return issues
}
