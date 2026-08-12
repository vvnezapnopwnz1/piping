import assert from "node:assert/strict"

import type { FabricationReadiness } from "../domain/quality-release"
import { describePaintGate, describeReleaseGate } from "./release-spool"

const ready: FabricationReadiness = {
  lineTotal: 1,
  lineChecked: 1,
  weldTotal: 1,
  weldComplete: 1,
  supportTotal: 0,
  supportRecorded: 0,
  ndePending: 0,
  pwhtPending: 0,
  revisionStatus: "accepted",
}

assert.deepEqual(describeReleaseGate(ready), { allowed: true, reason: null })

const blocked = describeReleaseGate({ ...ready, ndePending: 3 })
assert.equal(blocked.allowed, false)
assert.match(blocked.reason ?? "", /3 NDE/)

// Several blockers collapse into one sentence the user can act on.
const multiple = describeReleaseGate({ ...ready, lineChecked: 0, pwhtPending: 1 })
assert.equal(multiple.allowed, false)
assert.match(multiple.reason ?? "", /Material check/)
assert.match(multiple.reason ?? "", /PWHT/)

assert.deepEqual(describePaintGate(null, 240, null, null), {
  allowed: false,
  reason: "Record Sent to Paint before recording painting activities.",
})
assert.deepEqual(describePaintGate("2026-08-11", 240, 200, "W10P-1"), {
  allowed: false,
  reason: "The measured DFT of 200 microns is below the required 240 microns.",
})
assert.deepEqual(describePaintGate("2026-08-11", 240, 260, null), {
  allowed: false,
  reason: "A DFT measurement requires the W10P form number.",
})
assert.deepEqual(describePaintGate("2026-08-11", 240, 260, "W10P-1"), {
  allowed: true,
  reason: null,
})
assert.deepEqual(describePaintGate("2026-08-11", 240, null, null), {
  allowed: true,
  reason: null,
})
