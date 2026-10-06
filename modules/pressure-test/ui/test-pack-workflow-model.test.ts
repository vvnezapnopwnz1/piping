import assert from "node:assert/strict"
import test from "node:test"
import {
  canOperateWorkflow,
  computeEffectiveCompletedFlangeIds,
  deriveReinstatementCategoryFacts,
  filterActiveTestPackFlanges,
  summarizeWorkflowPresentation,
} from "./test-pack-workflow-model"
import type {
  FlangeJointReadinessRow,
  FlangeReinstatementRecordRow,
  TestPackMemberRow,
} from "../infrastructure/supabase-pressure-test-repository"

test("deriveReinstatementCategoryFacts distinguishes missing targets (N/A) from failed read (unknown)", () => {
  // Read failed: targets is null
  const failedRead = deriveReinstatementCategoryFacts("Y", null, [], true)
  assert.equal(failedRead.state, "unknown")

  // Read succeeded with 0 Y targets: N/A
  const noYTargets = deriveReinstatementCategoryFacts("Y", [], [], true)
  assert.equal(noYTargets.state, "not_applicable")
})

test("unassigned or incomplete Y targets do not count as complete", () => {
  const target: FlangeJointReadinessRow = {
    flange_joint_revision_id: "flange-1",
    isometric_id: "iso-1",
    category_code: "Y",
    revision_status: "accepted",
    is_removed: false,
    requires_reinstatement: true,
  } as never

  // Unassigned / no records -> ready if unlocked, blocked if locked
  const readyFacts = deriveReinstatementCategoryFacts("Y", [target], [], true)
  assert.equal(readyFacts.state, "ready")

  const blockedFacts = deriveReinstatementCategoryFacts("Y", [target], [], false)
  assert.equal(blockedFacts.state, "blocked")
})

test("multiple required targets: partial completion is ongoing, full is completed", () => {
  const target1: FlangeJointReadinessRow = {
    flange_joint_revision_id: "f-1",
    category_code: "Y",
    revision_status: "accepted",
    is_removed: false,
    requires_reinstatement: true,
  } as never
  const target2: FlangeJointReadinessRow = {
    flange_joint_revision_id: "f-2",
    category_code: "Y",
    revision_status: "accepted",
    is_removed: false,
    requires_reinstatement: true,
  } as never

  const record1: FlangeReinstatementRecordRow = {
    id: "rec-1",
    flange_joint_revision_id: "f-1",
    superseded_at: null,
  } as never

  const partial = deriveReinstatementCategoryFacts("Y", [target1, target2], [record1], true)
  assert.equal(partial.state, "ongoing")
  assert.equal(partial.completedTargetIds.size, 1)

  const record2: FlangeReinstatementRecordRow = {
    id: "rec-2",
    flange_joint_revision_id: "f-2",
    superseded_at: null,
  } as never

  const full = deriveReinstatementCategoryFacts("Y", [target1, target2], [record1, record2], true)
  assert.equal(full.state, "completed")
  assert.equal(full.completedTargetIds.size, 2)
})

test("superseded record does not close target", () => {
  const target: FlangeJointReadinessRow = {
    flange_joint_revision_id: "f-1",
    category_code: "Y",
  } as never
  const supersededRecord: FlangeReinstatementRecordRow = {
    id: "rec-1",
    flange_joint_revision_id: "f-1",
    superseded_at: "2026-08-10T12:00:00Z",
  } as never

  const completed = computeEffectiveCompletedFlangeIds([target], [supersededRecord])
  assert.equal(completed.size, 0)
})

test("filterActiveTestPackFlanges filters only active accepted non-removed flanges of active member ISOs", () => {
  const members: TestPackMemberRow[] = [
    { isometric_id: "iso-active", removed_at: null },
    { isometric_id: "iso-removed", removed_at: "2026-08-01" },
  ] as never

  const flanges: FlangeJointReadinessRow[] = [
    {
      flange_joint_revision_id: "f-1",
      isometric_id: "iso-active",
      category_code: "Y",
      revision_status: "accepted",
      is_removed: false,
      requires_reinstatement: true,
    },
    {
      flange_joint_revision_id: "f-2",
      isometric_id: "iso-removed",
      category_code: "Y",
      revision_status: "accepted",
      is_removed: false,
      requires_reinstatement: true,
    },
    {
      flange_joint_revision_id: "f-3",
      isometric_id: "iso-active",
      category_code: "Y",
      revision_status: "obsolete",
      is_removed: false,
      requires_reinstatement: true,
    },
  ] as never

  const active = filterActiveTestPackFlanges(members, flanges, "Y")
  assert.equal(active.length, 1)
  assert.equal(active[0].flange_joint_revision_id, "f-1")
})

test("precommissioning is blocked if required Y is not completed", () => {
  const members: TestPackMemberRow[] = [{ isometric_id: "iso-1", removed_at: null }] as never
  const yTarget: FlangeJointReadinessRow = {
    flange_joint_revision_id: "f-1",
    isometric_id: "iso-1",
    category_code: "Y",
    revision_status: "accepted",
    is_removed: false,
    requires_reinstatement: true,
  } as never

  const summary = summarizeWorkflowPresentation({
    isRft: true,
    blindingWorklist: [{ record_id: "blind-rec-1" }] as never,
    testingPrecommWorklist: [{ testing_started_on: "2026-08-10", testing_completed_on: "2026-08-11" }] as never,
    members,
    reinstatementTargets: [yTarget],
    effectiveRecords: [], // Y not completed
    lineCheckWorklist: [],
    itemClearanceWorklist: [],
  })

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
