import assert from "node:assert/strict"
import test from "node:test"
import * as XLSX from "xlsx"

import type { FabricationProgressSnapshot } from "../../domain/report"
import { renderFabricationProgress } from "./fabrication-progress"

const snapshot: FabricationProgressSnapshot = {
  projectCode: "EP-100",
  generatedAt: new Date("2026-08-09T10:00:00Z"),
  rows: [{
    spoolNumber: "SP-1", weldNumber: "W-1", weldLocation: "shop", wpsCode: "WPS-1",
    welders: ["W-01", "W-02"], weldedOn: "2026-08-08", ndePending: 1, ndeTotal: 2,
  }],
}

test("fabrication renderer creates a workbook with project metadata and source values", async () => {
  const blob = renderFabricationProgress(snapshot)
  assert.equal(blob.type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

  const workbook = XLSX.read(await blob.arrayBuffer())
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Fabrication Progress"], { header: 1 }) as unknown[][]
  assert.deepEqual(rows[0], ["Fabrication Progress"])
  assert.deepEqual(rows[3], ["Spool", "Weld", "Location", "WPS", "Welders", "Welded On", "NDE Pending", "NDE Total"])
  assert.deepEqual(rows[4], ["SP-1", "W-1", "shop", "WPS-1", "W-01, W-02", "2026-08-08", 1, 2])
})

test("fabrication renderer creates a readable header-only workbook for an empty project", async () => {
  const blob = renderFabricationProgress({ ...snapshot, rows: [] })
  const workbook = XLSX.read(await blob.arrayBuffer())
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets["Fabrication Progress"], { header: 1 }) as unknown[][]
  assert.equal(rows.length, 4)
  assert.deepEqual(rows[3], ["Spool", "Weld", "Location", "WPS", "Welders", "Welded On", "NDE Pending", "NDE Total"])
})
