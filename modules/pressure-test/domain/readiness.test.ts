import assert from "node:assert/strict"
import test from "node:test"
import { deriveIsometricReadiness, deriveTestPackRft, type IsometricReadinessFacts } from "./readiness"

const ready: IsometricReadinessFacts = {
  hasCurrentRevision: true,
  spoolTotal: 2,
  spoolComplete: 2,
  weldTotal: 3,
  weldComplete: 3,
  supportTotal: 1,
  supportComplete: 1,
  flangeTotal: 2,
  flangeComplete: 2,
  ndePending: 0,
  pwhtPending: 0,
  lineCheckAssigned: true,
  lineCheckCompleted: true,
  openXPunches: 0,
  qcReleased: true,
}

test("derives RFT only when every readiness gate is complete", () => {
  const result = deriveIsometricReadiness(ready)
  assert.deepEqual(result.blockers, [])
  assert.equal(result.isComplete, true)
  assert.equal(result.isQcReleased, true)
  assert.equal(result.isRft, true)
})

test("reports the roadmap blocker codes without storing readiness state", () => {
  const result = deriveIsometricReadiness({
    ...ready,
    weldComplete: 2,
    spoolComplete: 1,
    flangeComplete: 1,
    ndePending: 1,
    pwhtPending: 2,
    lineCheckCompleted: false,
    openXPunches: 1,
    qcReleased: false,
  })
  assert.deepEqual(result.blockers, ["WELD_OR_SUPPORT_PENDING", "FLANGE_PENDING", "NDE_PENDING", "PWHT_PENDING", "LINE_CHECK_PENDING", "X_OPEN"])
  assert.equal(result.isRft, false)
})

test("empty, blocked, and archived packs are not RFT", () => {
  assert.equal(deriveTestPackRft([], "active"), false)
  assert.equal(deriveTestPackRft([deriveIsometricReadiness({ ...ready, openXPunches: 1 })], "active"), false)
  assert.equal(deriveTestPackRft([deriveIsometricReadiness(ready)], "archived"), false)
})
