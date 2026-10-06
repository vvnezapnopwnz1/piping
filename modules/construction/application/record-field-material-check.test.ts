import assert from "node:assert/strict"

import type { BillLine, TraceEntry } from "../domain/material-check"
import { describeFieldMaterialCheckGate } from "./record-field-material-check"

const line = (identCode: string): BillLine => ({
  spoolRevisionMaterialId: `srm-${identCode}`,
  identCode,
  description: null,
  quantity: 1,
  unit: "EA",
  expectedTraceNumber: null,
})

const entry = (identCode: string, overrides: Partial<TraceEntry> = {}): TraceEntry => ({
  spoolRevisionMaterialId: `srm-${identCode}`,
  pipingMaterialRecordId: `pml-${identCode}`,
  identCode,
  traceNumber: "H-1",
  quantity: 1,
  ...overrides,
})

const LINES = [line("ID-100"), line("ID-200")]

// 1. A reader is told why rather than shown a control that the RPC will refuse.
assert.deepEqual(
  describeFieldMaterialCheckGate({
    lines: LINES,
    entries: [entry("ID-100")],
    toSiteOn: "2026-08-01",
    canRecord: false,
  }),
  {
    allowed: false,
    reason: "Recording a field material check needs the erection.progress.record capability.",
  },
)

// 2. Empty BOM
assert.deepEqual(
  describeFieldMaterialCheckGate({
    lines: [],
    entries: [],
    toSiteOn: "2026-08-01",
    canRecord: true,
  }),
  { allowed: false, reason: "This spool revision has no bill of materials to check." },
)

// 3. The field precondition is To Site (PQC54), not Start Fab
assert.deepEqual(
  describeFieldMaterialCheckGate({
    lines: LINES,
    entries: [entry("ID-100")],
    toSiteOn: null,
    canRecord: true,
  }),
  { allowed: false, reason: "Record To Site before checking field material." },
)

// 4. Empty entries
assert.deepEqual(
  describeFieldMaterialCheckGate({
    lines: LINES,
    entries: [],
    toSiteOn: "2026-08-01",
    canRecord: true,
  }),
  { allowed: false, reason: "Select at least one registered material trace." },
)

// 5. Stale or foreign row
assert.deepEqual(
  describeFieldMaterialCheckGate({
    lines: LINES,
    entries: [
      {
        spoolRevisionMaterialId: "srm-999",
        pipingMaterialRecordId: "pml-999",
        identCode: "ID-999",
        traceNumber: "H-999",
        quantity: 1,
      },
    ],
    toSiteOn: "2026-08-01",
    canRecord: true,
  }),
  { allowed: false, reason: "The material row is not in this spool revision BOM." },
)

// 6. A partial check is allowed: Material Check stays underived until every line carries a
// trace, which is the database's rule, not the screen's.
assert.deepEqual(
  describeFieldMaterialCheckGate({
    lines: LINES,
    entries: [entry("ID-100")],
    toSiteOn: "2026-08-01",
    canRecord: true,
  }),
  { allowed: true, reason: null },
)
