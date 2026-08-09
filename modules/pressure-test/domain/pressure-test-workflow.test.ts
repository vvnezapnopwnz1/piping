import assert from "node:assert/strict"
import test from "node:test"
import { canRecordPressureTestEvent, derivePressureTestState, isMonotonicDate, type PressureTestWorkflowFacts } from "./pressure-test-workflow"

const base: PressureTestWorkflowFacts = {
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

test("derives the manual pressure-test state sequence", () => {
  assert.equal(derivePressureTestState({ ...base, isRft: false }), "awaiting_rft")
  assert.equal(derivePressureTestState({ ...base, blindingAssigned: false }), "blinding_assigned")
  assert.equal(derivePressureTestState({ ...base, blindingCompleted: false }), "blinding_assigned")
  assert.equal(derivePressureTestState({ ...base, testingStarted: false }), "blinded")
  assert.equal(derivePressureTestState({ ...base, testingStarted: true }), "testing")
  assert.equal(derivePressureTestState({ ...base, testingStarted: true, testingCompleted: true }), "awaiting_y_reinstatement")
  assert.equal(derivePressureTestState({ ...base, testingStarted: true, testingCompleted: true, yReinstated: true }), "ready_for_precommissioning")
  assert.equal(derivePressureTestState({ ...base, testingStarted: true, testingCompleted: true, yReinstated: true, precommissioned: true }), "awaiting_z_reinstatement")
  assert.equal(derivePressureTestState({ ...base, testingStarted: true, testingCompleted: true, yReinstated: true, precommissioned: true, zReinstated: true }), "complete")
})
test("guards events by predecessor state and preserves monotonic dates", () => {
  assert.equal(canRecordPressureTestEvent("blinded", "testing_started"), true)
  assert.equal(canRecordPressureTestEvent("awaiting_rft", "testing_started"), false)
  assert.equal(canRecordPressureTestEvent("testing", "testing_completed"), true)
  assert.equal(canRecordPressureTestEvent("ready_for_precommissioning", "precommissioning_completed"), true)
  assert.equal(isMonotonicDate("2026-08-10", "2026-08-11"), true)
  assert.equal(isMonotonicDate("2026-08-11", "2026-08-10"), false)
})
