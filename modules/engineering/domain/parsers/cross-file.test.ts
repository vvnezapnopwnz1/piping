import assert from "node:assert/strict"
import { checkCrossFileConsistency, checkIsoUniformity, emptyFileSet } from "./cross-file"
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
