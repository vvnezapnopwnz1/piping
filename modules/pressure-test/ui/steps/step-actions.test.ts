import assert from "node:assert/strict"
import test from "node:test"

import { lineCheckTargets, openRows, punchDraftValid, punchTargets } from "./step-actions"

const members = [
  { isometric_id: "i1", iso_number: "ISO-1", removed_at: null },
  { isometric_id: "i2", iso_number: "ISO-2", removed_at: null },
  { isometric_id: "i3", iso_number: "ISO-3", removed_at: "2026-10-01" },
]

test("line check targets are the pack's active ISOs that have no live request", () => {
  const worklist = [
    { isometric_id: "i1", cancelled_at: null, result_id: null },
    { isometric_id: "i2", cancelled_at: "2026-10-02", result_id: null },
  ]
  assert.deepEqual(lineCheckTargets(members, worklist), [{ id: "i2", label: "ISO-2" }])
})

test("punch targets are the punches no live clearance request holds", () => {
  const punches = [{ id: "p1", item_number: "X-1" }, { id: "p2", item_number: "X-2" }]
  const worklist = [{ punch_item_id: "p1", cancelled_at: null, clearance_id: null }]
  assert.deepEqual(punchTargets(punches, worklist), [{ id: "p2", label: "X-2" }])
})

test("a punch with a description but no code is not a valid draft; no punch at all is", () => {
  assert.equal(punchDraftValid({ code: "", description: "paint damaged" }), false)
  assert.equal(punchDraftValid({ code: "", description: "" }), true)
  assert.equal(punchDraftValid({ code: "c1", description: "" }), true)
})

test("open rows are live requests without a result", () => {
  const rows = [
    { cancelled_at: null, result_id: null },
    { cancelled_at: null, result_id: "r" },
    { cancelled_at: "2026-10-02", result_id: null },
  ]
  assert.equal(openRows(rows, "result_id").length, 1)
})
