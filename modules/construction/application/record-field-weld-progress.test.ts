import assert from "node:assert/strict"

import type { WeldProgressInput } from "../domain/weld-progress"
import { describeFieldWeldProgressGate } from "./record-field-weld-progress"

const PROCEDURE = {
  id: "wps-1",
  code: "WPS-01",
  status: "active",
  subcontractorId: "sub-1",
  materialTypeId: "mt-1",
  diameterFrom: 1,
  diameterTo: 12,
  thicknessFrom: 1,
  thicknessTo: 30,
  approvedOn: "2026-01-01",
}

const WELDERS = [
  {
    id: "wq-root",
    welderCode: "W-01",
    status: "active",
    subcontractorId: "sub-1",
    expiresOn: "2027-01-01",
    wpsIds: ["wps-1"],
  },
  {
    id: "wq-cap",
    welderCode: "W-02",
    status: "active",
    subcontractorId: "sub-1",
    expiresOn: "2027-01-01",
    wpsIds: ["wps-1"],
  },
]

const WELD: WeldProgressInput = {
  joint: {
    weldLocation: "field",
    diameterInch: 6,
    thicknessMm: 10,
    availablePointTypes: ["root", "cap"],
  },
  procedure: PROCEDURE,
  subcontractorId: "sub-1",
  weldOn: "2026-08-12",
  points: [
    { pointType: "root", welderQualificationId: "wq-root", completionPercent: 50, weldedOn: "2026-08-12" },
    { pointType: "cap", welderQualificationId: "wq-cap", completionPercent: 50, weldedOn: "2026-08-12" },
  ],
  welders: WELDERS,
  isLocked: false,
  phase: "erection",
}

// The capability is checked before anything else, so a reader is told why rather than shown a
// control that the RPC refuses with a 403.
assert.deepEqual(
  describeFieldWeldProgressGate({ weld: WELD, toSiteOn: "2026-08-10", canRecord: false }),
  {
    allowed: false,
    reason: "Recording a field weld needs the erection.progress.record capability.",
  },
)

// PQC54: a field weld on a spool that has not reached site is refused by the command.
assert.deepEqual(describeFieldWeldProgressGate({ weld: WELD, toSiteOn: null, canRecord: true }), {
  allowed: false,
  reason: "Record To Site before recording field welds.",
})

assert.deepEqual(
  describeFieldWeldProgressGate({ weld: WELD, toSiteOn: "2026-08-10", canRecord: true }),
  { allowed: true, reason: null },
)

// Shared weld validation still applies: a locked joint stays refused, and the reason comes
// from the same domain rules the shop screen uses.
const lockedGate = describeFieldWeldProgressGate({
  weld: { ...WELD, isLocked: true },
  toSiteOn: "2026-08-10",
  canRecord: true,
})
assert.equal(lockedGate.allowed, false)
assert.ok(lockedGate.reason && lockedGate.reason.length > 0)

// Root and cap must total 100: 50 + 40 is refused by the shared allocation rule, not by a
// field-specific one.
const shortGate = describeFieldWeldProgressGate({
  weld: {
    ...WELD,
    points: [
      { pointType: "root", welderQualificationId: "wq-root", completionPercent: 50, weldedOn: "2026-08-12" },
      { pointType: "cap", welderQualificationId: "wq-cap", completionPercent: 40, weldedOn: "2026-08-12" },
    ],
  },
  toSiteOn: "2026-08-10",
  canRecord: true,
})
assert.equal(shortGate.allowed, false)
