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
      reason: "3 rows have blocking errors that must be fixed in the source file.",
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
      reason: "2 rows overwrite existing records. Confirm the overwrite to continue.",
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
      reason: "This import has already been applied.",
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
      reason: "Upload and validate the file before applying it.",
    }
  )

  console.log("All apply-import.test.ts assertions passed!")
}

run()
