import { test } from "node:test"
import assert from "node:assert/strict"
import { describeMaterialCheckGate, toMaterialCheckPayload } from "./record-material-check"
import type { BillLine } from "../domain/material-check"

const line: BillLine = { spoolRevisionMaterialId: "bom-1", identCode: "ID-1", description: null, quantity: 1, unit: "ea", expectedTraceNumber: null }
const entry = { spoolRevisionMaterialId: "bom-1", pipingMaterialRecordId: "pml-1" }

test("the payload carries only the BOM row and PML record ids", () => {
  const payload = toMaterialCheckPayload({ spoolRevisionId: "rev-1", checkedOn: "2026-10-06", qc13FormId: null, entries: [entry] })
  assert.deepEqual(payload.items, [{ spool_revision_material_id: "bom-1", piping_material_record_id: "pml-1" }])
})

test("recording needs a BOM, Start Fab and at least one chosen trace", () => {
  assert.equal(describeMaterialCheckGate([], [entry], "2026-10-01").allowed, false)
  assert.equal(describeMaterialCheckGate([line], [entry], null).allowed, false)
  assert.equal(describeMaterialCheckGate([line], [], "2026-10-01").allowed, false)
  assert.deepEqual(describeMaterialCheckGate([line], [entry], "2026-10-01"), { allowed: true, reason: null })
})
