import assert from "node:assert/strict"
import test from "node:test"

import { buildPackSteps, currentStepId, packStageGroup, type PackWorkflowRow } from "./pack-steps"

const row = (patch: Record<string, unknown>): PackWorkflowRow =>
  ({
    canonical_state: "awaiting_rft", rft_state: "blocked", blinding_state: "blocked", testing_state: "blocked",
    y_state: "not_applicable", precomm_state: "blocked", z_state: "not_applicable",
    line_check_total: 0, line_check_completed: 0, item_clearance_total: 0, item_clearance_cleared: 0,
    y_target_count: 0, y_completed_count: 0, z_target_count: 0, z_completed_count: 0,
    blockers: {}, ...patch,
  }) as unknown as PackWorkflowRow

test("a pack waiting for RFT blocks readiness with the counted reasons and later steps wait for it", () => {
  const steps = buildPackSteps(row({ blockers: { rft: { NDE_PENDING: 9, LINE_CHECK_PENDING: 10, X_OPEN: 0 }, blinding: ["rft_pending"] } }))
  const readiness = steps.find((step) => step.id === "readiness")!
  assert.equal(readiness.state, "blocked")
  assert.deepEqual(readiness.reasons, [
    { key: "steps.reason.ndePending", values: { count: 9 } },
    { key: "steps.reason.lineCheckPending", values: { count: 10 } },
  ])
  assert.deepEqual(steps.find((step) => step.id === "blinding")!.reasons, [{ key: "steps.wait.rft" }])
})

test("a tested pack that needs Y reinstatement is currently at that step", () => {
  const steps = buildPackSteps(row({
    canonical_state: "awaiting_y_reinstatement", rft_state: "completed", blinding_state: "completed", testing_state: "completed",
    y_state: "ready", y_target_count: 1, precomm_state: "blocked", line_check_total: 6, line_check_completed: 6,
  }))
  assert.equal(currentStepId(steps), "y_reinstatement")
  assert.equal(steps.find((step) => step.id === "testing")!.state, "done")
})

test("item clearance appears only when the pack has punches", () => {
  assert.equal(buildPackSteps(row({})).some((step) => step.id === "item_clearance"), false)
  assert.equal(buildPackSteps(row({ item_clearance_total: 2, item_clearance_cleared: 1 })).some((step) => step.id === "item_clearance"), true)
})

test("Y and Z reinstatement are left out when the server says they do not apply", () => {
  const ids = buildPackSteps(row({})).map((step) => step.id)
  assert.equal(ids.includes("y_reinstatement"), false)
  assert.equal(ids.includes("z_reinstatement"), false)
})

test("a complete pack has no current step", () => {
  const steps = buildPackSteps(row({
    canonical_state: "complete", rft_state: "completed", blinding_state: "completed", testing_state: "completed",
    y_state: "completed", precomm_state: "completed", z_state: "completed", line_check_total: 1, line_check_completed: 1,
  }))
  assert.equal(currentStepId(steps), null)
})

test("stage groups: waiting for RFT, complete, everything else active", () => {
  assert.equal(packStageGroup("awaiting_rft"), "waiting")
  assert.equal(packStageGroup("complete"), "done")
  assert.equal(packStageGroup("testing"), "active")
  assert.equal(packStageGroup("awaiting_z_reinstatement"), "active")
})
