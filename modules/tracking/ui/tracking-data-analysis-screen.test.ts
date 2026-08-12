import assert from "node:assert/strict"
import test from "node:test"
import { filterTrackingWorklist, groupActiveSpoolsByDesignArea } from "./tracking-screen-model"

const rows = [
  { projectId: "p", spoolId: "1", spoolRevisionId: "r1", isoNumber: "ISO-A", spoolNumber: "SP-1", pdsAreaCode: "AREA-A", constructionStatus: "active", currentLocationId: "l", currentLocationCode: "YARD", isInTransit: false, hasEverScanned: true, isActive: true, lastEventAt: null },
  { projectId: "p", spoolId: "2", spoolRevisionId: "r2", isoNumber: "ISO-B", spoolNumber: "SP-2", pdsAreaCode: "AREA-A", constructionStatus: "erected", currentLocationId: "l", currentLocationCode: "FIELD", isInTransit: false, hasEverScanned: true, isActive: false, lastEventAt: null },
]

test("analysis filters stable fields and excludes erected spools from design totals", () => {
  assert.deepEqual(filterTrackingWorklist(rows, "SP-2").map((row) => row.spoolId), ["2"])
  assert.deepEqual(groupActiveSpoolsByDesignArea(rows), [{ code: "AREA-A", activeSpoolCount: 1, locations: ["YARD"] }])
})
