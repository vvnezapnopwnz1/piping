import assert from "node:assert/strict"

import {
  normalizeTrace,
  reconcileMaterialCheck,
  type BillLine,
} from "./material-check"

const lines: BillLine[] = [
  {
    spoolRevisionMaterialId: "line-1",
    identCode: "IDN-100",
    description: "Pipe 6in",
    quantity: 3,
    unit: "m",
    expectedTraceNumber: "HEAT-100",
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

assert.equal(normalizeTrace("  heat-100 "), "HEAT-100")

const empty = reconcileMaterialCheck(lines, [])
assert.equal(empty.isComplete, false)
assert.equal(empty.checkedCount, 0)
assert.deepEqual(empty.outstanding.map((line) => line.identCode), ["IDN-100", "IDN-200"])
assert.deepEqual(empty.unknownIdentCodes, [])

const partial = reconcileMaterialCheck(lines, [
  { identCode: "IDN-100", traceNumber: " heat-100 ", quantity: 3 },
])
assert.equal(partial.isComplete, false)
assert.equal(partial.checkedCount, 1)
assert.deepEqual(partial.outstanding.map((line) => line.identCode), ["IDN-200"])

const complete = reconcileMaterialCheck(lines, [
  { identCode: "IDN-100", traceNumber: "HEAT-100", quantity: 3 },
  { identCode: "IDN-200", traceNumber: "HEAT-200", quantity: 2 },
])
assert.equal(complete.isComplete, true)
assert.equal(complete.checkedCount, 2)
assert.deepEqual(complete.outstanding, [])

// An ident code outside the bill of materials is reported, not silently dropped.
const stray = reconcileMaterialCheck(lines, [
  { identCode: "IDN-999", traceNumber: "HEAT-999", quantity: 1 },
])
assert.deepEqual(stray.unknownIdentCodes, ["IDN-999"])
assert.equal(stray.isComplete, false)

// Two heats against one line still satisfy that line once.
const split = reconcileMaterialCheck(lines, [
  { identCode: "IDN-100", traceNumber: "HEAT-100", quantity: 1 },
  { identCode: "IDN-100", traceNumber: "HEAT-101", quantity: 2 },
  { identCode: "IDN-200", traceNumber: "HEAT-200", quantity: 2 },
])
assert.equal(split.checkedCount, 2)
assert.equal(split.isComplete, true)

// An empty bill of materials is never complete: dossier 16.4 needs traced material.
assert.equal(reconcileMaterialCheck([], []).isComplete, false)
