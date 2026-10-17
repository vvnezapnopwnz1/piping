import assert from "node:assert/strict"
import test from "node:test"
import { canRecordPressureTestEvent, derivePressureTestState, isMonotonicDate, type PressureTestWorkflowFacts } from "./pressure-test-workflow"

const base: PressureTestWorkflowFacts = {
  canonicalState: "awaiting_rft",
  isRft: true,
  blindingAssigned: true,
  blindingCompleted: true,
  testingStarted: false,
  testingCompleted: false,
  yEligible: true,
  yReinstated: false,
  precommissioned: false,
  zEligible: true,
  zReinstated: false,
}

test("strictly returns server canonical state without client fallback ladder", () => {
  const states: PressureTestWorkflowFacts["canonicalState"][] = [
    "awaiting_rft",
    "blinding_assigned",
    "blinded",
    "testing",
    "tested",
    "awaiting_y_reinstatement",
    "ready_for_precommissioning",
    "precommissioned",
    "awaiting_z_reinstatement",
    "complete",
  ]
  for (const state of states) {
    assert.equal(derivePressureTestState({ ...base, canonicalState: state }), state)
  }
})

test("guards events by predecessor state and preserves monotonic dates", () => {
  assert.equal(canRecordPressureTestEvent("blinded", "testing_started"), true)
  assert.equal(canRecordPressureTestEvent("awaiting_rft", "testing_started"), false)
  assert.equal(canRecordPressureTestEvent("testing", "testing_completed"), true)
  assert.equal(canRecordPressureTestEvent("ready_for_precommissioning", "precommissioning_completed"), true)
  assert.equal(isMonotonicDate("2026-08-10", "2026-08-11"), true)
  assert.equal(isMonotonicDate("2026-08-11", "2026-08-10"), false)
})
