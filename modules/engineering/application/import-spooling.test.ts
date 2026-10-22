import assert from "node:assert/strict"
import test from "node:test"
import { buildStagingEntries, buildStagingRows } from "../domain/definition"
import { emptyFileSet } from "../domain/parsers/cross-file"
import type { SpoolgenRecord } from "../domain/parsers/spoolgen-parser"
import { buildSpoolgenSubmission } from "./import-spooling"

const weld = "ISO_NUMBER\tISO_REVISION\tPDS_AREA\tSERVICE_CLASS\tLINE_NUMBER\tSPOOL_NUMBER\tSPOOL_WEIGHT_KG\tWELD_NUMBER\tWELD_TYPE\tWELD_LOCATION\tDIAMETER_INCH\tTHICKNESS_MM\nISO-A\tR0\tPDS-A\tSC-A\tL-1\tSP-1\t100.5\tW-1\tBW\tshop\t6\t8.2\nISO-A\tR0\tPDS-A\tSC-A\tL-1\tSP-1\t100.5\tW-2\tBW\tshop\t6\t8.2"
const supp = "ISO_NUMBER\tSPOOL_NUMBER\tSUPPORT_NUMBER\tSUPPORT_TYPE\tQUANTITY\nISO-A\tSP-1\tSU-1\tSHOE\t2"
const submission = buildSpoolgenSubmission({ weld, supp })
assert.equal(submission.canSubmit, true)
assert.equal(submission.summary.blockerCount, 0)
assert.deepEqual(submission.rows.map((row) => row.normalizedValues.entity_type), ["isometric", "spool", "weld_joint", "weld_joint", "support"])
assert.deepEqual(submission.rows.map((row) => row.rowNumber), [1, 2, 3, 4, 5])
assert.equal(submission.rows[0].normalizedValues.revision_number, "R0")
assert.equal(submission.rows[1].normalizedValues.sequence_number, "1")
for (const row of submission.rows) for (const value of Object.values(row.normalizedValues)) assert.equal(typeof value, "string")
assert.equal(buildSpoolgenSubmission({ supp }).canSubmit, false)
assert.deepEqual(buildSpoolgenSubmission({ supp }).issues[0], { rowNumber: null, columnName: "weld", severity: "blocker", code: "MISSING_REQUIRED_FILE", message: "MISSING_REQUIRED_FILE", fileName: null })
assert.ok(buildSpoolgenSubmission({ weld, supp: "ISO_NUMBER\tSPOOL_NUMBER\tSUPPORT_NUMBER\nISO-A\tSP-9\tSU-9" }).issues.some((issue) => issue.code === "ORPHAN_SPOOL"))

const weldRecord = (lineNumber: number, iso: string, spool: string, weldNumber: string): SpoolgenRecord => ({ role: "weld", lineNumber, fileName: null, values: { iso_number: iso, spool_number: spool, weld_number: weldNumber } })
const traceRecord = (lineNumber: number, iso: string, spool: string): SpoolgenRecord => ({ role: "trace", lineNumber, fileName: null, values: { iso_number: iso, spool_number: spool, ident_code: "PIPE" } })

test("every staging row names the records it is built from, and the rows stay as they were", () => {
  const set = { ...emptyFileSet(), weld: [weldRecord(1, "ISO-A", "SP-1", "W-1"), weldRecord(2, "ISO-A", "SP-2", "W-2"), weldRecord(3, "ISO-B", "SP-1", "W-3")], trace: [traceRecord(1, "ISO-A", "SP-1")] }
  const entries = buildStagingEntries(set)
  assert.deepEqual(entries.map((entry) => entry.row), buildStagingRows(set))
  const linesOf = (kind: string) => entries.filter((entry) => entry.row.normalizedValues.entity_type === kind).map((entry) => entry.records.map((record) => `${record.role}:${record.lineNumber}`))
  assert.deepEqual(linesOf("isometric"), [["weld:1", "weld:2"], ["weld:3"]])
  assert.deepEqual(linesOf("spool"), [["weld:1"], ["weld:2"], ["weld:3"]])
  assert.deepEqual(linesOf("weld_joint"), [["weld:1"], ["weld:2"], ["weld:3"]])
  assert.deepEqual(linesOf("material"), [["trace:1"]])
})

test("a submission keeps the records of each row beside it", () => {
  const sources = buildSpoolgenSubmission({ weld, supp }).rowSources
  assert.deepEqual(sources.map((records) => records.map((record) => `${record.role}:${record.lineNumber}`)), [["weld:1", "weld:2"], ["weld:1", "weld:2"], ["weld:1"], ["weld:2"], ["supp:1"]])
})
