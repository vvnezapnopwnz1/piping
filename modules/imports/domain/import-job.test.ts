import assert from "node:assert/strict"
import {
  IMPORT_JOB_STATUSES,
  isTerminalStatus,
  canTransition,
  canApply,
} from "./import-job"

function run() {
  assert.equal(IMPORT_JOB_STATUSES.length, 8)

  assert.equal(isTerminalStatus("applied"), true)
  assert.equal(isTerminalStatus("failed"), true)
  assert.equal(isTerminalStatus("canceled"), true)
  assert.equal(isTerminalStatus("validated"), false)

  assert.equal(canTransition("draft", "uploaded"), true)
  assert.equal(canTransition("uploaded", "validated"), true)
  assert.equal(canTransition("validated", "applying"), true)
  assert.equal(canTransition("applied", "validating"), false)
  assert.equal(canTransition("canceled", "uploaded"), false)

  // Apply is only possible from validated, with no blockers, and conflicts confirmed.
  assert.equal(
    canApply({ status: "validated", blockerCount: 0, conflictCount: 0, conflictsConfirmed: false }),
    true
  )
  assert.equal(
    canApply({ status: "validated", blockerCount: 1, conflictCount: 0, conflictsConfirmed: true }),
    false
  )
  assert.equal(
    canApply({ status: "validated", blockerCount: 0, conflictCount: 2, conflictsConfirmed: false }),
    false
  )
  assert.equal(
    canApply({ status: "validated", blockerCount: 0, conflictCount: 2, conflictsConfirmed: true }),
    true
  )
  assert.equal(
    canApply({ status: "applied", blockerCount: 0, conflictCount: 0, conflictsConfirmed: true }),
    false
  )

  console.log("All import-job.test.ts assertions passed!")
}

run()
