import assert from "node:assert/strict"
import test from "node:test"

import { isoBlockerLines } from "./iso-blockers"

test("zero counters are skipped and a counted reason carries its count", () => {
  assert.deepEqual(isoBlockerLines({ NDE_PENDING: 2, X_OPEN: 0 }), [{ key: "steps.reason.ndePending", values: { count: 2 } }])
})
test("reasons come out in the readiness order", () => {
  assert.deepEqual(
    isoBlockerLines({ X_OPEN: 1, WELD_OR_SUPPORT_PENDING: 3 }).map((line) => line.key),
    ["steps.reason.weldOrSupportPending", "steps.reason.xOpen"],
  )
})
test("no counters, null or an unknown code give no lines", () => {
  assert.deepEqual(isoBlockerLines({}), [])
  assert.deepEqual(isoBlockerLines(null), [])
  assert.deepEqual(isoBlockerLines({ SOMETHING_NEW: 4 }), [])
})
