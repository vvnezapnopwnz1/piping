import * as XLSX from "xlsx"

import type { TrackingWorklistRow } from "../domain/tracking"

export interface BarcodeWorkbook {
  filename: string
  bytes: Uint8Array
}

function safeStem(projectCode: string): string {
  return projectCode.trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "project"
}

export function buildBarcodeWorkbook(projectCode: string, rows: readonly TrackingWorklistRow[], selectedSpoolIds: ReadonlySet<string>): BarcodeWorkbook {
  const selected = rows
    .filter((row) => selectedSpoolIds.has(row.spoolId))
    .sort((a, b) => a.spoolNumber.localeCompare(b.spoolNumber))
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Spool Number", "ISO Number", "PDS Area", "Current Location", "Barcode Value"],
    ...selected.map((row) => [row.spoolNumber, row.isoNumber, row.pdsAreaCode ?? "", row.currentLocationCode ?? "", row.spoolNumber]),
  ])
  worksheet["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 22 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Spool Barcodes")
  const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  return { filename: `${safeStem(projectCode)}-spool-barcodes.xlsx`, bytes: new Uint8Array(output) }
}
