import assert from "node:assert/strict"

import { deriveRft } from "./rft"

const base = {
  weldedBoltedOn: "2026-08-12T10:00:00Z",
  supportedOn: "2026-08-13T10:00:00Z",
  ndePending: 0,
  pwhtPending: 0,
  materialCheckedOn: "2026-08-11T10:00:00Z",
  lastFieldWeldOn: "2026-08-12T12:00:00Z",
  lastFieldSupportOn: "2026-08-13T11:00:00Z",
}

assert.deepEqual(deriveRft({ ...base, ndePending: 1 }), { isRft: false, rftOn: null })
assert.deepEqual(deriveRft({ ...base, supportedOn: null }), { isRft: false, rftOn: null })
assert.deepEqual(deriveRft(base), { isRft: true, rftOn: "2026-08-13T11:00:00Z" })
