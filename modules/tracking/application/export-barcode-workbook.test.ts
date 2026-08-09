import assert from "node:assert/strict"
import test from "node:test"
import * as XLSX from "xlsx"
import { buildBarcodeWorkbook } from "./export-barcode-workbook"

test("barcode workbook contains only selected stable spool rows", () => {
  const rows = [
    { projectId: "p", spoolId: "s1", spoolRevisionId: "r1", isoNumber: "ISO-1", spoolNumber: "SP-1", pdsAreaCode: "AREA-A", constructionStatus: "active", currentLocationId: "l", currentLocationCode: "YARD", isInTransit: false, hasEverScanned: true, isActive: true, lastEventAt: null },
    { projectId: "p", spoolId: "s2", spoolRevisionId: "r2", isoNumber: "ISO-2", spoolNumber: "SP-2", pdsAreaCode: null, constructionStatus: "active", currentLocationId: null, currentLocationCode: null, isInTransit: true, hasEverScanned: true, isActive: true, lastEventAt: null },
  ]
  const result = buildBarcodeWorkbook("TRACK 08", rows, new Set(["s2"]))
  assert.equal(result.filename, "TRACK-08-spool-barcodes.xlsx")
  const workbook = XLSX.read(result.bytes, { type: "array" })
  assert.deepEqual(workbook.SheetNames, ["Spool Barcodes"])
  const values = XLSX.utils.sheet_to_json(workbook.Sheets["Spool Barcodes"]!, { header: 1 }) as unknown[][]
  assert.deepEqual(values[0], ["Spool Number", "ISO Number", "PDS Area", "Current Location", "Barcode Value"])
  assert.deepEqual(values[1], ["SP-2", "ISO-2", "", "", "SP-2"])
  assert.equal(values.length, 2)
})
