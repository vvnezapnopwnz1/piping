import assert from "node:assert/strict"
import test from "node:test"

import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"
import { erectionOperationForPath, erectionStep, nextErectionOperation } from "./erection-operations"

const row = (overrides: Partial<ErectionReadiness> = {}): ErectionReadiness => ({
  spoolRevisionId: "r1",
  projectId: "p1",
  isoNumber: "ISO-1",
  spoolNumber: "SP-1",
  revisionNumber: "R0",
  revisionStatus: "accepted",
  materialLineTotal: 2,
  materialLineChecked: 2,
  materialCheckedOn: null,
  fieldWeldTotal: 2,
  fieldWeldComplete: 0,
  lastFieldWeldOn: null,
  fieldSupportTotal: 1,
  fieldSupportRecorded: 0,
  lastFieldSupportOn: null,
  toSiteOn: "2026-06-26",
  erectedOn: "2026-06-29",
  weldedBoltedOn: null,
  supportedOn: null,
  ndePending: 0,
  pwhtPending: 0,
  isRft: false,
  rftOn: null,
  ...overrides,
})

test("every erection route opens the workbench on its operation", () => {
  assert.equal(erectionOperationForPath("/erection/to-site", null), "to_site")
  assert.equal(erectionOperationForPath("/erection/material-check", null), "material")
  assert.equal(erectionOperationForPath("/erection/erected", null), "erected")
  assert.equal(erectionOperationForPath("/erection/welded-bolted", null), "welded")
  assert.equal(erectionOperationForPath("/erection/weld-progress", null), "welded")
  assert.equal(erectionOperationForPath("/erection/supported", null), "supported")
  assert.equal(erectionOperationForPath("/erection", "rft"), "rft")
  assert.equal(erectionOperationForPath("/erection/to-site", "supported"), "supported")
  assert.equal(erectionOperationForPath("/erection", null), null)
  assert.equal(erectionOperationForPath("/erection", "nonsense"), null)
})

test("op is canonical while existing step links still open", () => {
  assert.equal(erectionOperationForPath("/erection", "supported", "rft"), "supported")
  assert.equal(erectionOperationForPath("/erection", null, "rft"), "rft")
  assert.equal(erectionOperationForPath("/erection", "invalid", "welded"), "welded")
  assert.equal(erectionOperationForPath("/erection/to-site", "invalid", "invalid"), "to_site")
})

test("the next operation is the first milestone without a date; RFT is derived after them", () => {
  assert.equal(nextErectionOperation(row({ toSiteOn: null, erectedOn: null })), "to_site")
  assert.equal(nextErectionOperation(row()), "welded")
  assert.equal(nextErectionOperation(row({ weldedBoltedOn: "2026-07-01", supportedOn: "2026-07-02" })), "rft")
  assert.equal(erectionStep("welded", row()).state, "next")
  assert.equal(erectionStep("erected", row()).state, "done")
  assert.equal(erectionStep("supported", row()).state, "later")
  // Field material is evidence, never the step the spool is waiting on.
  assert.notEqual(erectionStep("material", row({ materialLineChecked: 0 })).state, "next")
  assert.equal(erectionStep("rft", row({ isRft: true, rftOn: "2026-07-03T00:00:00Z" })).lines[0].value, "2026-07-03")
})
