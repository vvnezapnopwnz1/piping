import * as XLSX from "xlsx"
import { templateHeaderRow, type ImportType } from "../domain/import-type"
import type { SheetMatrix } from "../domain/parsers/registry"

export function buildTemplateWorkbook(importType: ImportType): Uint8Array {
  const worksheet = XLSX.utils.aoa_to_sheet([templateHeaderRow(importType)])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template")
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as Uint8Array
}

/** A date cell is read as the calendar day the user sees: local components, so no time zone shifts it. */
function dateCellToIso(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${String(value.getFullYear()).padStart(4, "0")}-${month}-${day}`
}

export function readFirstSheetMatrix(bytes: ArrayBuffer | Uint8Array): SheetMatrix {
  // cellDates: Excel stores 2026-09-01 as the serial 46266; without it the importer would see 46266.
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []
  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
  })
  return rows.map((row) => row.map((cell) => (cell instanceof Date ? dateCellToIso(cell) : cell)))
}

export async function computeChecksum(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
