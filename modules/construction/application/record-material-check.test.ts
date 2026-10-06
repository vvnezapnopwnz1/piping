import assert from "node:assert/strict"

import type { BillLine, TraceEntry } from "../domain/material-check"
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
    expectedTraceNumber: "Heat-ab12",
  },
]

const entry = (overrides: Partial<TraceEntry> = {}): TraceEntry => ({
  spoolRevisionMaterialId: "line-1",
  pipingMaterialRecordId: "pml-1",
  identCode: "IDN-100",
  traceNumber: "Heat-ab12",
  quantity: 3,
  ...overrides,
})

// 1. Start Fab precondition
assert.deepEqual(describeMaterialCheckGate(lines, [], null), {
  allowed: false,
  reason: "Record Start Fab before recording material traces.",
})

// 2. Empty entries
assert.deepEqual(describeMaterialCheckGate(lines, [], "2026-08-04"), {
  allowed: false,
  reason: "Select at least one registered material trace.",
})

// 3. Stale or foreign row
assert.deepEqual(
  describeMaterialCheckGate(
    lines,
    [entry({ spoolRevisionMaterialId: "line-999" })],
    "2026-08-04",
  ),
  {
    allowed: false,
    reason: "The material row is not in this spool revision BOM.",
  },
)

// 4. Trace mismatch
assert.deepEqual(
  describeMaterialCheckGate(
    lines,
    [entry({ traceNumber: "WRONG-HEAT" })],
    "2026-08-04",
  ),
  {
    allowed: false,
    reason: "The selected trace does not match the BOM trace.",
  },
)

// 5. Valid entry
assert.deepEqual(
  describeMaterialCheckGate(
    lines,
    [entry()],
    "2026-08-04",
  ),
  { allowed: true, reason: null },
)

// 6. Empty BOM
assert.deepEqual(
  describeMaterialCheckGate([], [], "2026-08-04"),
  { allowed: false, reason: "This spool revision has no bill of materials to check." },
)

// 7. Payload preserves exact casing and mapping
assert.deepEqual(
  toMaterialCheckPayload({
    spoolRevisionId: "spool-rev-1",
    checkedOn: "2026-08-05",
    qc13FormId: null,
    entries: [
      {
        spoolRevisionMaterialId: "line-1",
        pipingMaterialRecordId: "pml-1",
        identCode: "  idn-100  ",
        traceNumber: "  Heat-ab12  ",
        quantity: 3,
      },
    ],
  }),
  {
    target_spool_revision_id: "spool-rev-1",
    checked_on: "2026-08-05",
    items: [
      {
        spool_revision_material_id: "line-1",
        piping_material_record_id: "pml-1",
        ident_code: "idn-100",
        trace_number: "Heat-ab12",
        quantity: 3,
      },
    ],
    qc13_form_id: null,
  },
)

// 8. Carry QC-13 Form ID into payload
{
  const payload = toMaterialCheckPayload({
    spoolRevisionId: "spool-1",
    checkedOn: "2026-08-05",
    qc13FormId: "form-1",
    entries: [entry()],
  })
  assert.equal(payload.qc13_form_id, "form-1")
  assert.equal(payload.items.length, 1)
  assert.equal(payload.items[0].spool_revision_material_id, "line-1")
  assert.equal(payload.items[0].piping_material_record_id, "pml-1")
}
