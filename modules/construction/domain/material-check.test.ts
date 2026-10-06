import assert from "node:assert/strict"

import {
  reconcileMaterialCheck,
  type BillLine,
  type TraceEntry,
} from "./material-check"

const lines: BillLine[] = [
  {
    spoolRevisionMaterialId: "line-1",
    identCode: "IDN-100",
    description: "Pipe 6in",
    quantity: 3,
    unit: "m",
    expectedTraceNumber: "Heat-ab12",
  },
  {
    spoolRevisionMaterialId: "line-2",
    identCode: "IDN-200",
    description: "Elbow 6in",
    quantity: 2,
    unit: "ea",
    expectedTraceNumber: null,
  },
]

// 1. Empty entries
const empty = reconcileMaterialCheck(lines, [])
assert.equal(empty.isComplete, false)
assert.equal(empty.checkedCount, 0)
assert.deepEqual(empty.outstanding.map((line) => line.identCode), ["IDN-100", "IDN-200"])
assert.deepEqual(empty.invalidEntries, [])

// 2. Partial valid check with exact case preserved
const partial = reconcileMaterialCheck(lines, [
  {
    spoolRevisionMaterialId: "line-1",
    pipingMaterialRecordId: "pml-1",
    identCode: "IDN-100",
    traceNumber: "Heat-ab12",
    quantity: 3,
  },
])
assert.equal(partial.isComplete, false)
assert.equal(partial.checkedCount, 1)
assert.deepEqual(partial.outstanding.map((line) => line.identCode), ["IDN-200"])
assert.deepEqual(partial.invalidEntries, [])

// 3. Complete check across all BOM rows
const complete = reconcileMaterialCheck(lines, [
  {
    spoolRevisionMaterialId: "line-1",
    pipingMaterialRecordId: "pml-1",
    identCode: "IDN-100",
    traceNumber: "Heat-ab12",
    quantity: 3,
  },
  {
    spoolRevisionMaterialId: "line-2",
    pipingMaterialRecordId: "pml-2",
    identCode: "IDN-200",
    traceNumber: "HEAT-200",
    quantity: 2,
  },
])
assert.equal(complete.isComplete, true)
assert.equal(complete.checkedCount, 2)
assert.deepEqual(complete.outstanding, [])
assert.deepEqual(complete.invalidEntries, [])

// 4. Unknown BOM row ID rejected
const unknownRow = reconcileMaterialCheck(lines, [
  {
    spoolRevisionMaterialId: "line-999",
    pipingMaterialRecordId: "pml-1",
    identCode: "IDN-100",
    traceNumber: "Heat-ab12",
    quantity: 1,
  },
])
assert.equal(unknownRow.isComplete, false)
assert.equal(unknownRow.checkedCount, 0)
assert.deepEqual(unknownRow.invalidEntries, [
  { spoolRevisionMaterialId: "line-999", reason: "The material row is not in this spool revision BOM." },
])

// 5. Duplicate BOM row in single command rejected (one trace per row)
const duplicateRow = reconcileMaterialCheck(lines, [
  {
    spoolRevisionMaterialId: "line-1",
    pipingMaterialRecordId: "pml-1",
    identCode: "IDN-100",
    traceNumber: "Heat-ab12",
    quantity: 1,
  },
  {
    spoolRevisionMaterialId: "line-1",
    pipingMaterialRecordId: "pml-1b",
    identCode: "IDN-100",
    traceNumber: "Heat-ab12",
    quantity: 2,
  },
])
assert.equal(duplicateRow.isComplete, false)
assert.equal(duplicateRow.invalidEntries[0].reason, "Select one trace per BOM row.")

// 6. Same Ident with different BOM row IDs and different expected trace numbers
const duplicateIdentLines: BillLine[] = [
  {
    spoolRevisionMaterialId: "b1",
    identCode: "ID-1",
    description: null,
    quantity: 1,
    unit: "ea",
    expectedTraceNumber: "Heat-ab12",
  },
  {
    spoolRevisionMaterialId: "b2",
    identCode: "ID-1",
    description: null,
    quantity: 1,
    unit: "ea",
    expectedTraceNumber: "H2",
  },
]
const firstCheck: TraceEntry = {
  spoolRevisionMaterialId: "b1",
  pipingMaterialRecordId: "p1",
  identCode: "ID-1",
  traceNumber: "Heat-ab12",
  quantity: 1,
}
const duplicateIdentResult = reconcileMaterialCheck(duplicateIdentLines, [firstCheck])
assert.equal(duplicateIdentResult.checkedCount, 1)
assert.equal(duplicateIdentResult.isComplete, false)
assert.deepEqual(duplicateIdentResult.outstanding.map((x) => x.spoolRevisionMaterialId), ["b2"])

// Both entries satisfy duplicate Ident lines
const bothCheck: TraceEntry[] = [
  firstCheck,
  {
    spoolRevisionMaterialId: "b2",
    pipingMaterialRecordId: "p2",
    identCode: "ID-1",
    traceNumber: "H2",
    quantity: 1,
  },
]
const duplicateIdentBothResult = reconcileMaterialCheck(duplicateIdentLines, bothCheck)
assert.equal(duplicateIdentBothResult.checkedCount, 2)
assert.equal(duplicateIdentBothResult.isComplete, true)
assert.deepEqual(duplicateIdentBothResult.outstanding, [])

// 7. Wrong Ident code
const wrongIdent = reconcileMaterialCheck(lines, [
  {
    spoolRevisionMaterialId: "line-1",
    pipingMaterialRecordId: "pml-1",
    identCode: "WRONG-IDENT",
    traceNumber: "Heat-ab12",
    quantity: 3,
  },
])
assert.equal(wrongIdent.isComplete, false)
assert.equal(
  wrongIdent.invalidEntries[0].reason,
  "The selected trace belongs to a different Ident code.",
)

// 8. Wrong expected trace
const wrongTrace = reconcileMaterialCheck(lines, [
  {
    spoolRevisionMaterialId: "line-1",
    pipingMaterialRecordId: "pml-1",
    identCode: "IDN-100",
    traceNumber: "Heat-WRONG",
    quantity: 3,
  },
])
assert.equal(wrongTrace.isComplete, false)
assert.equal(
  wrongTrace.invalidEntries[0].reason,
  "The selected trace does not match the BOM trace.",
)

// 9. Null expected trace in BOM allows any registered trace for that Ident
const nullExpectedTrace = reconcileMaterialCheck(lines, [
  {
    spoolRevisionMaterialId: "line-2",
    pipingMaterialRecordId: "pml-2",
    identCode: "IDN-200",
    traceNumber: "ANY-TRACE-001",
    quantity: 2,
  },
])
assert.equal(nullExpectedTrace.checkedCount, 1)
assert.equal(nullExpectedTrace.invalidEntries.length, 0)

// 10. Missing PML ID or blank trace
const missingPml = reconcileMaterialCheck(lines, [
  {
    spoolRevisionMaterialId: "line-1",
    pipingMaterialRecordId: "",
    identCode: "IDN-100",
    traceNumber: "Heat-ab12",
    quantity: 3,
  },
])
assert.equal(missingPml.invalidEntries[0].reason, "Select a registered PML trace.")

// 11. Invalid quantity
const invalidQty = reconcileMaterialCheck(lines, [
  {
    spoolRevisionMaterialId: "line-1",
    pipingMaterialRecordId: "pml-1",
    identCode: "IDN-100",
    traceNumber: "Heat-ab12",
    quantity: -5,
  },
])
assert.equal(
  invalidQty.invalidEntries[0].reason,
  "Material quantity must be a non-negative finite number.",
)

// 12. Accepted line IDs (e.g. historical / inactive records) contribute to satisfied count
const withAccepted = reconcileMaterialCheck(lines, [], ["line-1"])
assert.equal(withAccepted.checkedCount, 1)
assert.equal(withAccepted.isComplete, false)
assert.deepEqual(withAccepted.outstanding.map((x) => x.spoolRevisionMaterialId), ["line-2"])

// All lines in acceptedLineIds
const allAccepted = reconcileMaterialCheck(lines, [], ["line-1", "line-2"])
assert.equal(allAccepted.checkedCount, 2)
assert.equal(allAccepted.isComplete, true)
assert.deepEqual(allAccepted.outstanding, [])

// 13. Empty bill of materials is never complete
assert.equal(reconcileMaterialCheck([], []).isComplete, false)
