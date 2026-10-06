import { test } from "node:test"
import assert from "node:assert/strict"

import type { BillLine, TraceEntry } from "../domain/material-check"
import { describeFieldMaterialCheckGate } from "./record-field-material-check"

const line: BillLine = { spoolRevisionMaterialId: "bom-1", identCode: "ID-1", description: null, quantity: 1, unit: "ea", expectedTraceNumber: null }
const entry: TraceEntry = { spoolRevisionMaterialId: "bom-1", pipingMaterialRecordId: "pml-1" }

test("recording needs a BOM, To Site, at least one chosen trace, and capability", () => {
  assert.equal(describeFieldMaterialCheckGate({ lines: [line], entries: [entry], toSiteOn: "2026-10-01", canRecord: false }).allowed, false)
  assert.equal(describeFieldMaterialCheckGate({ lines: [], entries: [entry], toSiteOn: "2026-10-01", canRecord: true }).allowed, false)
  assert.equal(describeFieldMaterialCheckGate({ lines: [line], entries: [entry], toSiteOn: null, canRecord: true }).allowed, false)
  assert.equal(describeFieldMaterialCheckGate({ lines: [line], entries: [], toSiteOn: "2026-10-01", canRecord: true }).allowed, false)
  assert.deepEqual(describeFieldMaterialCheckGate({ lines: [line], entries: [entry], toSiteOn: "2026-10-01", canRecord: true }), { allowed: true, reason: null })
})
