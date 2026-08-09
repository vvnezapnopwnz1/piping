import assert from "node:assert/strict"
import test from "node:test"
import { filterTrackingWorklist } from "./tracking-screen-model"

test("barcode selection filter remains project-worklist based", () => {
  const rows = [{ projectId: "p", spoolId: "s", spoolRevisionId: "r", isoNumber: "ISO-10", spoolNumber: "SP-10", pdsAreaCode: "AREA", constructionStatus: "active", currentLocationId: null, currentLocationCode: null, isInTransit: true, hasEverScanned: true, isActive: true, lastEventAt: null }]
  assert.equal(filterTrackingWorklist(rows, "ISO-10").length, 1)
  assert.equal(filterTrackingWorklist(rows, "missing").length, 0)
})
