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
assert.deepEqual(blocked.reason, { code: "release_blockers", blockers: [{ code: "nde_open", values: { count: 3 } }] })

// Every blocker is reported, in the order the server checks them.
const multiple = describeReleaseGate({ ...ready, lineChecked: 0, pwhtPending: 1 })
assert.equal(multiple.allowed, false)
assert.deepEqual(multiple.reason, { code: "release_blockers", blockers: [{ code: "material_incomplete", values: { checked: 0, total: 1 } }, { code: "pwht_open", values: { count: 1 } }] })

assert.deepEqual(describePaintGate(null, 240, null, null), {
  allowed: false,
  reason: { code: "sent_to_paint_first" },
})
assert.deepEqual(describePaintGate("2026-08-11", 240, 200, "W10P-1"), {
  allowed: false,
  reason: { code: "dft_below", measured: 200, required: 240 },
})
assert.deepEqual(describePaintGate("2026-08-11", 240, 260, null), {
  allowed: false,
  reason: { code: "w10p_required" },
})
assert.deepEqual(describePaintGate("2026-08-11", 240, 260, "W10P-1"), {
  allowed: true,
  reason: null,
})
assert.deepEqual(describePaintGate("2026-08-11", 240, null, null), {
  allowed: true,
  reason: null,
})
