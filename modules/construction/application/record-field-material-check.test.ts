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

const entry = (identCode: string): TraceEntry => ({ identCode, traceNumber: "H-1", quantity: 1 })

const LINES = [line("ID-100"), line("ID-200")]

// A reader is told why rather than shown a control that the RPC will refuse.
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

assert.deepEqual(
  describeFieldMaterialCheckGate({
    lines: [],
    entries: [],
    toSiteOn: "2026-08-01",
    canRecord: true,
  }),
  { allowed: false, reason: "This spool revision has no bill of materials to check." },
)

// The field precondition is To Site (PQC54), not Start Fab — this is the one rule that
// differs from the shop gate.
assert.deepEqual(
  describeFieldMaterialCheckGate({
    lines: LINES,
    entries: [entry("ID-100")],
    toSiteOn: null,
    canRecord: true,
  }),
  { allowed: false, reason: "Record To Site before checking field material." },
)

assert.deepEqual(
  describeFieldMaterialCheckGate({
    lines: LINES,
    entries: [],
    toSiteOn: "2026-08-01",
    canRecord: true,
  }),
  { allowed: false, reason: "Enter at least one material trace." },
)

assert.deepEqual(
  describeFieldMaterialCheckGate({
    lines: LINES,
    entries: [entry("ID-999")],
    toSiteOn: "2026-08-01",
    canRecord: true,
  }),
  { allowed: false, reason: "ID-999 is not on this spool revision bill of materials." },
)

// A partial check is allowed: Material Check stays underived until every line carries a
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
