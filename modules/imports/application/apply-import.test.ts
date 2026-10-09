import assert from "node:assert/strict"
import { describeApplyGate } from "./apply-import"

function run() {
  assert.deepEqual(
    describeApplyGate({
      status: "validated",
      blockerCount: 0,
      conflictCount: 0,
      conflictsConfirmed: false,
    }),
    { allowed: true, requiresConfirmation: false, reason: null }
  )

  assert.deepEqual(
    describeApplyGate({
      status: "validated",
      blockerCount: 3,
      conflictCount: 0,
      conflictsConfirmed: false,
    }),
    {
      allowed: false,
      requiresConfirmation: false,
      reason: { code: "blockers", count: 3 },
    }
  )

  assert.deepEqual(
    describeApplyGate({
      status: "validated",
      blockerCount: 0,
      conflictCount: 2,
      conflictsConfirmed: false,
    }),
    {
      allowed: false,
      requiresConfirmation: true,
      reason: { code: "conflictsUnconfirmed", count: 2 },
    }
  )

  assert.deepEqual(
    describeApplyGate({
      status: "applied",
      blockerCount: 0,
      conflictCount: 0,
      conflictsConfirmed: true,
    }),
    {
      allowed: false,
      requiresConfirmation: false,
      reason: { code: "alreadyApplied" },
    }
  )

  assert.deepEqual(
    describeApplyGate({
      status: "draft",
      blockerCount: 0,
      conflictCount: 0,
      conflictsConfirmed: false,
    }),
    {
      allowed: false,
      requiresConfirmation: false,
      reason: { code: "notValidated" },
    }
  )

  assert.deepEqual(
    describeApplyGate({ status: "canceled", blockerCount: 0, conflictCount: 0, conflictsConfirmed: false }),
    { allowed: false, requiresConfirmation: false, reason: { code: "closed" } }
  )

  console.log("All apply-import.test.ts assertions passed!")
}

run()
