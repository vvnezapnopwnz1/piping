import assert from "node:assert/strict"
import test from "node:test"

import {
  buildReportFileName,
  REPORT_DEFINITIONS,
} from "./report"

test("Demo Lite exposes only the two real project snapshot reports", () => {
  assert.deepEqual(
    REPORT_DEFINITIONS.map((report) => report.code),
    ["RPT-F-001", "RPT-T-001"],
  )
  assert.equal(
    REPORT_DEFINITIONS.every((report) => report.requiredCapability === "reports.view"),
    true,
  )
})

test("report filenames are stable, project-specific, and sortable", () => {
  assert.equal(
    buildReportFileName(
      REPORT_DEFINITIONS[0],
      "EP-100 / Area A",
      new Date("2026-08-09T10:11:12Z"),
    ),
    "EP-100-Area-A-fabrication-progress-2026-08-09.xlsx",
  )
})
