import * as XLSX from "xlsx"
import { templateHeaderRow, type ImportType } from "../domain/import-type"
import type { SheetMatrix } from "../domain/parsers/registry"

export function buildTemplateWorkbook(importType: ImportType): Uint8Array {
  const worksheet = XLSX.utils.aoa_to_sheet([templateHeaderRow(importType)])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template")
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as Uint8Array
}

export function readFirstSheetMatrix(bytes: ArrayBuffer | Uint8Array): SheetMatrix {
  const workbook = XLSX.read(bytes, { type: "array" })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []
  const worksheet = workbook.Sheets[firstSheetName]
  return XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
  })
}

export async function computeChecksum(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
