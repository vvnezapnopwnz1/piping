import * as XLSX from "xlsx"

import type { TrackingWorklistRow } from "../domain/tracking"
import enTracking from "@/messages/en/tracking.json"

export interface BarcodeWorkbook {
  filename: string
  bytes: Uint8Array
}

export type BarcodeWorkbookKey =
  | "barcodes.headers.spoolNumber"
  | "barcodes.headers.isoNumber"
  | "barcodes.headers.pdsArea"
  | "barcodes.headers.currentLocation"
  | "barcodes.headers.barcodeValue"
  | "barcodes.sheetName"

export type TrackingTranslate = (key: BarcodeWorkbookKey) => string

function safeStem(projectCode: string): string {
  return projectCode.trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "project"
}

export function buildBarcodeWorkbook(
  projectCode: string,
  rows: readonly TrackingWorklistRow[],
  selectedSpoolIds: ReadonlySet<string>,
  t?: TrackingTranslate,
): BarcodeWorkbook {
  const headers = [
    t ? t("barcodes.headers.spoolNumber") : enTracking.barcodes.headers.spoolNumber,
    t ? t("barcodes.headers.isoNumber") : enTracking.barcodes.headers.isoNumber,
    t ? t("barcodes.headers.pdsArea") : enTracking.barcodes.headers.pdsArea,
    t ? t("barcodes.headers.currentLocation") : enTracking.barcodes.headers.currentLocation,
    t ? t("barcodes.headers.barcodeValue") : enTracking.barcodes.headers.barcodeValue,
  ]
  const sheetName = t ? t("barcodes.sheetName") : enTracking.barcodes.sheetName
  const selected = rows
    .filter((row) => selectedSpoolIds.has(row.spoolId))
    .sort((a, b) => a.spoolNumber.localeCompare(b.spoolNumber))
  const worksheet = XLSX.utils.aoa_to_sheet([
    headers,
    ...selected.map((row) => [row.spoolNumber, row.isoNumber, row.pdsAreaCode ?? "", row.currentLocationCode ?? "", row.spoolNumber]),
  ])
  worksheet["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 22 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  return { filename: `${safeStem(projectCode)}-spool-barcodes.xlsx`, bytes: new Uint8Array(output) }
}
