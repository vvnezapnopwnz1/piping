import assert from "node:assert/strict"

import type { BillLine } from "../domain/material-check"
import {
  describeMaterialCheckGate,
  toMaterialCheckPayload,
} from "./record-material-check"

const lines: BillLine[] = [
  {
    spoolRevisionMaterialId: "line-1",
    identCode: "IDN-100",
    description: null,
    quantity: 3,
    unit: "m",
    expectedTraceNumber: null,
  },
]

assert.deepEqual(describeMaterialCheckGate(lines, [], null), {
  allowed: false,
  reason: "Record Start Fab before recording material traces.",
})
assert.deepEqual(describeMaterialCheckGate(lines, [], "2026-08-04"), {
  allowed: false,
  reason: "Enter at least one material trace.",
})
assert.deepEqual(
  describeMaterialCheckGate(
    lines,
    [{ identCode: "IDN-999", traceNumber: "HEAT-1", quantity: null }],
    "2026-08-04",
  ),
  {
    allowed: false,
    reason: "IDN-999 is not on this spool revision bill of materials.",
  },
)
assert.deepEqual(
  describeMaterialCheckGate(
    lines,
    [{ identCode: "IDN-100", traceNumber: "HEAT-1", quantity: 3 }],
    "2026-08-04",
  ),
  { allowed: true, reason: null },
)
assert.deepEqual(
  describeMaterialCheckGate([], [], "2026-08-04"),
  { allowed: false, reason: "This spool revision has no bill of materials to check." },
)

assert.deepEqual(
  toMaterialCheckPayload({
    spoolRevisionId: "spool-rev-1",
    checkedOn: "2026-08-05",
    qc13FormId: null,
    entries: [{ identCode: " idn-100 ", traceNumber: " heat-1 ", quantity: 3 }],
  }),
  {
    target_spool_revision_id: "spool-rev-1",
    checked_on: "2026-08-05",
    items: [{ ident_code: "IDN-100", trace_number: "HEAT-1", quantity: 3 }],
    qc13_form_id: null,
  },
)

// The screen issues a QC-13 and must carry its id into the command, so the accepted
// traces keep the evidence they were transcribed from (dossier 16.4).
{
  const payload = toMaterialCheckPayload({
    spoolRevisionId: "spool-1",
    checkedOn: "2026-08-05",
    qc13FormId: "form-1",
    entries: [{ identCode: "IDN-1", traceNumber: "HEAT-1", quantity: 2 }],
  })
  assert.equal(payload.qc13_form_id, "form-1")
  assert.equal(payload.items.length, 1)
}
