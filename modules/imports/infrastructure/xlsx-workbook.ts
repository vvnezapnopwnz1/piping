import * as XLSX from "xlsx"
import { templateHeaderRow, type ImportType } from "../domain/import-type"
import type { SheetMatrix } from "../domain/parsers/registry"

/**
 * A sheet of a workbook the app writes: the tab name and its rows, the first row being the headers.
 * Excel allows at most 31 characters per sheet name and no two the same, so the names stay short and fixed.
 */
export interface WorkbookSheet { name: string; rows: readonly (readonly unknown[])[] }

/** A workbook of plain rows. A sheet name is what a reader looks for, so it is never translated. */
export function buildWorkbook(sheets: readonly WorkbookSheet[]): Uint8Array {
  const workbook = XLSX.utils.book_new()
  for (const sheet of sheets) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows.map((row) => [...row])), sheet.name)
  // type "array" yields an ArrayBuffer; the caller gets bytes it can pass to a Blob or to a reader as it is.
  return new Uint8Array(XLSX.write(workbook, { bookType: "xlsx", type: "array" }))
}

export function buildTemplateWorkbook(importType: ImportType): Uint8Array {
  return buildWorkbook([{ name: "Template", rows: [templateHeaderRow(importType)] }])
}

/** A date cell is read as the calendar day the user sees: local components, so no time zone shifts it. */
function dateCellToIso(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${String(value.getFullYear()).padStart(4, "0")}-${month}-${day}`
}

/**
 * The rows of one sheet: the sheet named like `sheetName` (in any case, without padding) when the workbook has one,
 * else the first sheet. A template carries one sheet per file role beside its help and code sheets, and the import
 * reads the role's own sheet; a workbook of one sheet reads as before.
 */
export function readSheetMatrix(bytes: ArrayBuffer | Uint8Array, sheetName?: string): SheetMatrix {
  // cellDates: Excel stores 2026-09-01 as the serial 46266; without it the importer would see 46266.
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true })
  const wanted = sheetName?.trim().toLowerCase()
  const name = (wanted === undefined ? undefined : workbook.SheetNames.find((sheet) => sheet.trim().toLowerCase() === wanted)) ?? workbook.SheetNames[0]
  const worksheet = name === undefined ? undefined : workbook.Sheets[name]
  if (worksheet === undefined) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
  })
  return rows.map((row) => row.map((cell) => (cell instanceof Date ? dateCellToIso(cell) : cell)))
}

/** A sheet as Excel shows it: the rows that hold a value, and beside each the row number Excel prints on its left. */
export interface NumberedSheet { rows: SheetMatrix; rowNumbers: readonly number[] }

/**
 * The sheets named in `names` (in any case, without padding), read once, each keyed by the name as asked; a sheet
 * the workbook lacks is left out, never replaced by the first one. A blank row is dropped, but the next row keeps its
 * own number, so a message can point at the row a person sees. Only a `header` other than 1 makes SheetJS mark each
 * row with `__rowNum__`, hence `header: "A"` and the columns put back in order from the sheet's range.
 */
export function readNumberedSheets(bytes: ArrayBuffer | Uint8Array, names: readonly string[]): Partial<Record<string, NumberedSheet>> {
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true })
  const read: Partial<Record<string, NumberedSheet>> = {}
  for (const name of names) {
    const wanted = name.trim().toLowerCase()
    const found = workbook.SheetNames.find((sheet) => sheet.trim().toLowerCase() === wanted)
    const worksheet = found === undefined ? undefined : workbook.Sheets[found]
    if (worksheet === undefined) continue
    const ref = worksheet["!ref"]
    if (ref === undefined) { read[name] = { rows: [], rowNumbers: [] }; continue }
    const range = XLSX.utils.decode_range(ref)
    const columns = Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) => XLSX.utils.encode_col(range.s.c + index))
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { header: "A", blankrows: false, defval: "" })
    read[name] = {
      rows: records.map((record) => columns.map((column) => { const cell = record[column]; return cell instanceof Date ? dateCellToIso(cell) : cell })),
      rowNumbers: records.map((record) => (record as { __rowNum__: number }).__rowNum__ + 1),
    }
  }
  return read
}

export function readFirstSheetMatrix(bytes: ArrayBuffer | Uint8Array): SheetMatrix {
  return readSheetMatrix(bytes)
}

export async function computeChecksum(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
