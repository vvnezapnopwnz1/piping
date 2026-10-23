import assert from "node:assert/strict"
import { checkCrossFileConsistency, checkIsoUniformity, checkNumberUniqueness, emptyFileSet } from "./cross-file"
import type { SpoolgenRecord } from "./spoolgen-parser"

const weld = (lineNumber: number, overrides: Record<string, string> = {}): SpoolgenRecord => ({ role: "weld", lineNumber, fileName: null, values: { iso_number: "ISO-A", revision_number: "R0", pds_area: "PDS-A", service_class: "SC-A", line_number: "L-1", sheet_number: "1", spool_number: "SP-1", spool_weight_kg: "10", material_class: "CS", weld_number: "W-1", weld_type: "BW", weld_location: "shop", diameter_inch: "6", thickness_mm: "8.2", ...overrides } })
assert.deepEqual(checkCrossFileConsistency({ ...emptyFileSet(), weld: [weld(1)] }), [])
const orphan = checkCrossFileConsistency({ ...emptyFileSet(), weld: [weld(1)], bolt: [{ role: "bolt", lineNumber: 1, fileName: null, values: { iso_number: "ISO-A", spool_number: "SP-9" } }] })
assert.deepEqual(orphan, [{ rowNumber: 1, columnName: "spool_number", severity: "blocker", code: "ORPHAN_SPOOL", message: "ORPHAN_SPOOL", fileName: null, role: "bolt" }])
// One workbook repeats a row number on every sheet, so an issue names the role of the record it points at
assert.deepEqual(checkCrossFileConsistency({ ...emptyFileSet(), weld: [weld(1)], trace: [{ role: "trace", lineNumber: 1, fileName: null, values: { iso_number: "ISO-A", spool_number: "SP-9" } }] }).map((issue) => issue.role), ["trace"])
const mixed = checkIsoUniformity([weld(1), weld(2, { service_class: "SC-B" }), weld(3, { line_number: "L-2" }), weld(4, { revision_number: "R1" })])
assert.ok(mixed.some((issue) => issue.code === "ISO_MIXED_SERVICE_CLASS"))
assert.ok(mixed.some((issue) => issue.code === "ISO_MIXED_LINE"))
assert.ok(mixed.some((issue) => issue.code === "ISO_MIXED_REVISION"))
// An issue names the file of the record it points at
const filed = (record: SpoolgenRecord, fileName: string): SpoolgenRecord => ({ ...record, fileName })
assert.deepEqual(checkCrossFileConsistency({ ...emptyFileSet(), bolt: [filed({ role: "bolt", lineNumber: 4, fileName: null, values: { iso_number: "ISO-A", spool_number: "SP-9" } }, "bolts.csv")] }).map((issue) => [issue.rowNumber, issue.fileName]), [[4, "bolts.csv"]])
assert.deepEqual(checkIsoUniformity([filed(weld(12), "ISO-A.pcf"), filed(weld(30, { line_number: "L-2" }), "ISO-A.pcf")]), [{ rowNumber: 12, columnName: "line_number", severity: "blocker", code: "ISO_MIXED_LINE", message: "ISO_MIXED_LINE", fileName: "ISO-A.pcf", role: "weld" }])

// A number names one thing of the project. A repeat that says something else is an error, a repeat that says the same is a
// warning, and only the later rows are reported: the first one is the row that stays.
const numbers = (weldRows: SpoolgenRecord[], others: Partial<ReturnType<typeof emptyFileSet>> = {}) => checkNumberUniqueness({ ...emptyFileSet(), weld: weldRows, ...others })
const ofColumn = (issues: ReturnType<typeof numbers>, column: string) => issues.filter((issue) => issue.columnName === column)
assert.deepEqual(numbers([weld(1), weld(2, { weld_number: "W-2" })]), [])
assert.deepEqual(numbers([weld(1), weld(2)]), [{ rowNumber: 2, columnName: "weld_number", severity: "warning", code: "NUMBER_DUPLICATE_SAME", message: "NUMBER_DUPLICATE_SAME", fileName: null, role: "weld" }])
assert.deepEqual(numbers([weld(1), weld(2, { diameter_inch: "4" })]).map((issue) => [issue.rowNumber, issue.code, issue.severity]), [[2, "NUMBER_DUPLICATE", "blocker"]], "another size is another weld")
for (const change of <Record<string, string>[]>[{ spool_number: "SP-2" }, { weld_type: "SW" }, { weld_location: "field" }, { thickness_mm: "9.5" }]) {
  assert.deepEqual(ofColumn(numbers([weld(1), weld(2, change)]), "weld_number").map((issue) => issue.code), ["NUMBER_DUPLICATE"], JSON.stringify(change))
}
// The same facts written differently are the same: case, padding and number format do not count
assert.deepEqual(numbers([weld(1), weld(2, { weld_type: " bw ", weld_location: "SHOP", diameter_inch: "6.0", thickness_mm: "8.20" })]).map((issue) => issue.code), ["NUMBER_DUPLICATE_SAME"])
// Three rows: each one after the first is reported against the first
assert.deepEqual(numbers([weld(1), weld(2), weld(3, { diameter_inch: "4" })]).map((issue) => [issue.rowNumber, issue.code]), [[2, "NUMBER_DUPLICATE_SAME"], [3, "NUMBER_DUPLICATE"]])
// A blank number is the missing-value check's business, not a duplicate of the other blank one
assert.deepEqual(numbers([weld(1, { weld_number: "" }), weld(2, { weld_number: "" })]), [])
// The issue names the file and role of the later record
assert.deepEqual(numbers([filed(weld(5), "a.pcf"), filed(weld(9, { diameter_inch: "4" }), "b.pcf")]).map((issue) => [issue.rowNumber, issue.fileName, issue.role]), [[9, "b.pcf", "weld"]])
// The same number in another isometric is one thing of the project to the database, so it is an error whatever else the row says
for (const change of <Record<string, string>[]>[{ iso_number: "ISO-B" }, { iso_number: "ISO-B", diameter_inch: "4" }]) {
  assert.deepEqual(ofColumn(numbers([weld(1), weld(2, change)]), "weld_number").map((issue) => [issue.rowNumber, issue.code, issue.severity]), [[2, "NUMBER_IN_OTHER_ISO", "blocker"]], JSON.stringify(change))
}
// A prefixed number is another weld: ISO-A-1 and ISO-B-1 are fine
assert.deepEqual(ofColumn(numbers([weld(1, { weld_number: "ISO-A-1" }), weld(2, { iso_number: "ISO-B", spool_number: "SP-B", weld_number: "ISO-B-1" })]), "weld_number"), [])
// Reported once per row: a third row in the second isometric repeats a number its own isometric already has
assert.deepEqual(ofColumn(numbers([weld(1), weld(2, { iso_number: "ISO-B" }), weld(3, { iso_number: "ISO-B" })]), "weld_number").map((issue) => [issue.rowNumber, issue.code]), [[2, "NUMBER_IN_OTHER_ISO"], [3, "NUMBER_DUPLICATE_SAME"]])

// A spool is many weld rows: its number repeats inside its isometric and is an error in another one
assert.deepEqual(numbers([weld(1), weld(2, { weld_number: "W-2" }), weld(3, { weld_number: "W-3", iso_number: "ISO-B", spool_number: "SP-1" })]).filter((issue) => issue.columnName === "spool_number").map((issue) => [issue.rowNumber, issue.code]), [[3, "NUMBER_IN_OTHER_ISO"]])
assert.deepEqual(ofColumn(numbers([weld(1), weld(2, { weld_number: "W-2" })]), "spool_number"), [])

// Flange joints (manual 19.2: a repeated bolt number is an error against the joint) and supports follow the same rules
const bolt = (lineNumber: number, overrides: Record<string, string> = {}): SpoolgenRecord => ({ role: "bolt", lineNumber, fileName: null, values: { iso_number: "ISO-A", spool_number: "SP-1", flange_number: "BT01", flange_rating: "150#", diameter_inch: "6", bolt_size: "3/4", bolt_quantity: "8", joint_type: "RF", ...overrides } })
const supp = (lineNumber: number, overrides: Record<string, string> = {}): SpoolgenRecord => ({ role: "supp", lineNumber, fileName: null, values: { iso_number: "ISO-A", spool_number: "SP-1", support_number: "SU-1", support_type: "SHOE", quantity: "1", ...overrides } })
const flanges = (rows: SpoolgenRecord[]) => checkNumberUniqueness({ ...emptyFileSet(), weld: [weld(1)], bolt: rows })
assert.deepEqual(flanges([bolt(1), bolt(2)]).map((issue) => [issue.rowNumber, issue.columnName, issue.code, issue.role]), [[2, "flange_number", "NUMBER_DUPLICATE_SAME", "bolt"]])
assert.deepEqual(flanges([bolt(1), bolt(2, { bolt_quantity: "12" })]).map((issue) => issue.code), ["NUMBER_DUPLICATE"])
assert.deepEqual(flanges([bolt(1), bolt(2, { iso_number: "ISO-B" })]).map((issue) => [issue.columnName, issue.code]), [["flange_number", "NUMBER_IN_OTHER_ISO"]])
const supports = (rows: SpoolgenRecord[]) => checkNumberUniqueness({ ...emptyFileSet(), weld: [weld(1)], supp: rows })
assert.deepEqual(supports([supp(1), supp(2, { support_type: "GUIDE" })]).map((issue) => [issue.columnName, issue.code, issue.role]), [["support_number", "NUMBER_DUPLICATE", "supp"]])
assert.deepEqual(supports([supp(1), supp(2, { support_number: "SU-2" })]), [])

// An isometric belongs to one PDS area, like one class and one line
assert.ok(checkIsoUniformity([weld(1), weld(2, { pds_area: "PDS-B" })]).some((issue) => issue.code === "ISO_MIXED_PDS_AREA"))
assert.deepEqual(checkIsoUniformity([weld(1), weld(2, { weld_number: "W-2" })]), [])
