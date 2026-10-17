import assert from "node:assert/strict"
import test from "node:test"
import {
  canOperateWorkflow,
  summarizeWorkflowPresentation,
} from "./test-pack-workflow-model"

test("precommissioning is blocked if required Y is not completed in workflowRow", () => {
  const workflowRow = {
    test_pack_id: "tp-1",
    project_id: "proj-1",
    test_pack_number: "TP-001",
    revision_no: 1,
    is_rft: true,
    rft_on: "2026-08-01",
    blinding_assigned: true,
    blinding_completed: true,
    testing_started: true,
    testing_completed: true,
    precommissioned: false,
    y_target_count: 1,
    y_completed_count: 0,
    z_target_count: 0,
    z_completed_count: 0,
    line_check_total: 0,
    line_check_completed: 0,
    item_clearance_total: 0,
    item_clearance_cleared: 0,
    rft_state: "completed",
    blinding_state: "completed",
    testing_state: "completed",
    y_state: "ready",
    precomm_state: "blocked",
    z_state: "not_applicable",
    canonical_state: "awaiting_y_reinstatement",
    blockers: { precommissioning: ["y_reinstatement_pending"] },
    available_operations: ["y_reinstatement"],
  } as never

  const summary = summarizeWorkflowPresentation({ workflowRow })

  assert.equal(summary.testingState, "completed")
  assert.equal(summary.yState, "ready")
  assert.equal(summary.precommState, "blocked")
})


test("canOperateWorkflow restricts writes for Reader, archived, or stale data", () => {
  assert.deepEqual(canOperateWorkflow(true, "active", true), { allowed: true })
  assert.equal(canOperateWorkflow(false, "active", true).allowed, false)
  assert.equal(canOperateWorkflow(true, "archived", true).allowed, false)
  assert.equal(canOperateWorkflow(true, "active", false).allowed, false)
})

test("summarizeWorkflowPresentation respects authoritative server workflow projection", () => {
  const workflowRow = {
    test_pack_id: "tp-1",
    project_id: "proj-1",
    test_pack_number: "TP-001",
    revision_no: 1,
    is_rft: true,
    rft_on: "2026-08-01",
    blinding_assigned: true,
    blinding_completed: true,
    blinding_completed_on: "2026-08-02",
    testing_started: true,
    testing_started_on: "2026-08-03",
    testing_completed: true,
    testing_completed_on: "2026-08-04",
    precommissioned: false,
    precommissioning_completed_on: null,
    y_target_count: 2,
    y_completed_count: 1,
    z_target_count: 3,
    z_completed_count: 0,
    line_check_total: 4,
    line_check_completed: 4,
    item_clearance_total: 2,
    item_clearance_cleared: 2,
    rft_state: "completed",
    blinding_state: "completed",
    testing_state: "completed",
    y_state: "ongoing",
    precomm_state: "blocked",
    z_state: "blocked",
    canonical_state: "awaiting_y_reinstatement",
    blockers: {
      precommissioning: ["y_reinstatement_pending"],
    },
    available_operations: ["y_reinstatement"],
  } as never

  const summary = summarizeWorkflowPresentation({ workflowRow })

  assert.equal(summary.canonicalState, "awaiting_y_reinstatement")
  assert.equal(summary.rftState, "completed")
  assert.equal(summary.blindingState, "completed")
  assert.equal(summary.testingState, "completed")
  assert.equal(summary.yState, "ongoing")
  assert.equal(summary.precommState, "blocked")
  assert.equal(summary.zState, "blocked")
  assert.deepEqual(summary.availableOperations, ["y_reinstatement"])
  assert.deepEqual(summary.blockers?.precommissioning, ["y_reinstatement_pending"])
  assert.equal(summary.lineCheckSummary.open, 0)
  assert.equal(summary.itemClearanceSummary.open, 0)
})
