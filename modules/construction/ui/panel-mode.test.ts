import { test } from "node:test"
import assert from "node:assert/strict"
import { panelMode } from "./panel-mode"

test("panel mode", () => {
  assert.equal(panelMode({ allRecorded: true, blockedBy: "QC release" }), "done")
  assert.equal(panelMode({ allRecorded: false, blockedBy: "QC release" }), "blocked")
  assert.equal(panelMode({ allRecorded: false, blockedBy: null }), "actionable")
})
