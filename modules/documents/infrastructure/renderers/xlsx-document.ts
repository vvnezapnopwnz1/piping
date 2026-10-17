import * as XLSX from "xlsx"

import { headerLines, type DocumentChrome, type DocumentHeader, type DocumentTable } from "../../domain/document"

const MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
const MAX_COLUMN_WIDTH = 60

/** The four header lines, an empty row, then the table; an empty table says so in its first row. */
export function documentSheet(
  header: DocumentHeader,
  chrome: DocumentChrome,
  table: DocumentTable,
  widths?: number[],
): XLSX.WorkSheet {
  const body = table.body.length === 0 ? [[chrome.noRecords]] : table.body
  const sheet = XLSX.utils.aoa_to_sheet([
    ...headerLines(header, chrome).map((line) => [line]),
    [],
    table.head,
    ...body,
  ])
  const columnWidths = widths ?? table.head.map((label, index) =>
    Math.max(label.length, ...table.body.map((row) => String(row[index] ?? "").length)) + 2)
  sheet["!cols"] = columnWidths.map((wch) => ({ wch: Math.min(wch, MAX_COLUMN_WIDTH) }))
  return sheet
}

/** Excel limits sheet names to 31 characters and forbids `[]:*?/\`. */
function sheetName(name: string): string {
  return name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31)
}

export function xlsxBlob(sheets: readonly { name: string; sheet: XLSX.WorkSheet }[]): Blob {
  const workbook = XLSX.utils.book_new()
  for (const { name, sheet } of sheets) XLSX.utils.book_append_sheet(workbook, sheet, sheetName(name))
  const content = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  return new Blob([content], { type: MIME_TYPE })
}
