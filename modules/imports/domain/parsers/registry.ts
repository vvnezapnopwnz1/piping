import { getImportTypeDefinition, type ImportType } from "../import-type"
import type { ImportIssue } from "../import-issue"

export interface ParsedRow {
  rowNumber: number
  rawValues: Record<string, string>
  normalizedValues: Record<string, unknown>
  action: "create" | "update" | "unchanged" | "skip"
}

export interface ParseOutcome {
  rows: ParsedRow[]
  issues: ImportIssue[]
}

export type SheetMatrix = readonly (readonly unknown[])[]

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

function normalizeCompositionText(key: string, value: string): string {
  if (["system", "subsystem", "test_pack_number", "test_pack_revision", "test_medium", "service_class", "line_service", "iso_number", "iso_revision", "spool_number", "spool_revision"].includes(key)) {
    return value.toUpperCase()
  }
  return value
}

function normalizeCompositionDate(value: string): string {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value
}

export function parseSheet(importType: ImportType, sheet: SheetMatrix): ParseOutcome {
  const definition = getImportTypeDefinition(importType)
  const issues: ImportIssue[] = []

  if (sheet.length === 0) {
    issues.push({
      rowNumber: null,
      columnName: null,
      severity: "blocker",
      code: "EMPTY_SHEET",
      message: "The selected sheet is empty.",
    })
    return { rows: [], issues }
  }

  const headerRow = sheet[0].map(cellToString)
  const headerIndexByKey = new Map<string, number>()

  for (const column of definition.columns) {
    const index = headerRow.findIndex(
      (header) => header.toLowerCase() === column.header.toLowerCase()
    )
    if (index === -1) {
      if (column.required) {
        issues.push({
          rowNumber: null,
          columnName: column.key,
          severity: "blocker",
          code: "MISSING_COLUMN",
          message: `The required column "${column.header}" is missing from the sheet.`,
        })
      }
      continue
    }
    headerIndexByKey.set(column.key, index)
  }

  if (issues.some((issue) => issue.code === "MISSING_COLUMN")) {
    return { rows: [], issues }
  }

  const rows: ParsedRow[] = []
  let rowNumber = 0

  for (let lineIndex = 1; lineIndex < sheet.length; lineIndex++) {
    const line = sheet[lineIndex]
    const rawValues: Record<string, string> = {}
    let hasAnyValue = false

    for (const column of definition.columns) {
      const index = headerIndexByKey.get(column.key)
      const raw = index === undefined ? "" : cellToString(line[index])
      rawValues[column.key] = raw
      if (raw !== "") hasAnyValue = true
    }

    if (!hasAnyValue) continue

    rowNumber += 1
    const normalizedValues: Record<string, unknown> = {}

    for (const column of definition.columns) {
      const raw = rawValues[column.key]

      if (raw === "") {
        if (column.required) {
          issues.push({
            rowNumber,
            columnName: column.key,
            severity: "blocker",
            code: "REQUIRED",
            message: `"${column.header}" is mandatory.`,
          })
        }
        normalizedValues[column.key] = column.kind === "textList" ? [] : null
        continue
      }

      if (column.kind === "number") {
        const parsed = Number(raw)
        if (!Number.isFinite(parsed)) {
          issues.push({
            rowNumber,
            columnName: column.key,
            severity: "blocker",
            code: "NOT_A_NUMBER",
            message: `"${column.header}" must be numeric, received "${raw}".`,
          })
          normalizedValues[column.key] = null
          continue
        }
        normalizedValues[column.key] = parsed
        continue
      }

      if (column.kind === "textList") {
        normalizedValues[column.key] = raw
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part !== "")
        continue
      }

      if (importType === "test_pack_composition") {
        if (column.key === "planned_start_on" || column.key === "planned_end_on") {
          normalizedValues[column.key] = normalizeCompositionDate(raw)
        } else {
          normalizedValues[column.key] = normalizeCompositionText(column.key, raw)
        }
      } else {
        normalizedValues[column.key] = raw
      }
    }

    rows.push({ rowNumber, rawValues, normalizedValues, action: "create" })
  }

  return { rows, issues }
}
