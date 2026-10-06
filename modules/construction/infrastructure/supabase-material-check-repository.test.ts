import { test } from "node:test"
import assert from "node:assert/strict"
import { toMaterialCheckWorkspace } from "./supabase-material-check-repository"

const baseLine = {
  spool_revision_material_id: "bom-1", spool_revision_id: "rev-1", ident_code: "ID-1", description: "Pipe",
  quantity: 1, unit: "ea", expected_trace_number: "Heat-ab12",
  accepted_piping_material_record_id: null, accepted_trace_number: null, accepted_mrr_number: null, accepted_status: null,
}

test("lines map to BOM lines and accepted evidence keeps exact case", () => {
  const ws = toMaterialCheckWorkspace({
    lines: [{ ...baseLine, accepted_piping_material_record_id: "pml-1", accepted_trace_number: "Heat-ab12", accepted_mrr_number: "MRR-1", accepted_status: "active" }],
    record: null, forms: [],
  })
  assert.equal(ws.lines[0].expectedTraceNumber, "Heat-ab12")
  assert.deepEqual(ws.accepted, [{ spoolRevisionMaterialId: "bom-1", pipingMaterialRecordId: "pml-1", traceNumber: "Heat-ab12", mrrNumber: "MRR-1", status: "active" }])
})

test("accepted evidence whose PML row is not readable keeps the id with null labels", () => {
  const ws = toMaterialCheckWorkspace({ lines: [{ ...baseLine, accepted_piping_material_record_id: "pml-9" }], record: null, forms: [] })
  assert.deepEqual(ws.accepted[0], { spoolRevisionMaterialId: "bom-1", pipingMaterialRecordId: "pml-9", traceNumber: null, mrrNumber: null, status: null })
})

test("the recorded QC-13 and the latest QC-13 are told apart", () => {
  const forms = [
    { id: "f2", form_number: "QC13-2", requested_on: "2026-10-04" },
    { id: "f1", form_number: "QC13-1", requested_on: "2026-10-01" },
  ]
  const ws = toMaterialCheckWorkspace({ lines: [], record: { id: "r1", checked_on: "2026-10-02", qc13_form_id: "f1" }, forms })
  assert.equal(ws.record?.qc13Form?.formNumber, "QC13-1")
  assert.equal(ws.latestQc13Form?.formNumber, "QC13-2")
})
