import assert from "node:assert/strict"
import { DEFAULT_PCF_SETTINGS } from "../domain/import-template"
import { spoolgenIssue } from "../domain/spoolgen-issue"
import { buildPcfSubmission, type PcfSource, inFileNameOrder } from "./import-pcf"

const pipeline = (line: string, weld: string) => [
  `PIPELINE-REFERENCE ${line}`, "    REVISION 1", "    PIPING-SPEC CS150",
  "PIPE", "    END-POINT 0 0 0 100 BW", "    END-POINT 1000 0 0 100 BW", `    SPOOL-IDENTIFIER ${line}-S1`,
  "WELD", "    END-POINT 1000 0 0 100", "    SKEY WW", `    REPEAT-WELD-IDENTIFIER ${weld}`,
]
const pcf = (...pipelines: string[][]) => ["UNITS-BORE MM", ...pipelines.flat()].join("\n")
const a: PcfSource = { fileName: "ISO-A.pcf", text: pcf(pipeline("L-A", "1"), pipeline("L-A", "2")) }
const b: PcfSource = { fileName: "ISO-B.pcf", text: pcf(pipeline("L-B", "1")) }
const context = { pdsArea: "PDS-A", settings: DEFAULT_PCF_SETTINGS }

// The files are read in name order, so the order they were picked in never changes the rows
const forward = buildPcfSubmission([a, b], context)
assert.deepEqual(buildPcfSubmission([b, a], context).rows, forward.rows)
assert.deepEqual(buildPcfSubmission([b, a], context), forward)
assert.deepEqual(forward.rows.map((row) => [row.normalizedValues.entity_type, row.normalizedValues.iso_number, row.normalizedValues.spool_number ?? "", row.normalizedValues.weld_number ?? ""]), [
  ["isometric", "ISO-A", "", ""], ["isometric", "ISO-B", "", ""],
  ["spool", "ISO-A", "L-A-S1", ""], ["spool", "ISO-B", "L-B-S1", ""],
  ["weld_joint", "ISO-A", "L-A-S1", "1"], ["weld_joint", "ISO-A", "L-A-S1", "2"], ["weld_joint", "ISO-B", "L-B-S1", "1"],
])
assert.equal(forward.rows[0].normalizedValues.pds_area, "PDS-A")
assert.equal(forward.canSubmit, true)
assert.deepEqual(forward.issues, [])
assert.deepEqual(forward.summary, { blockerCount: 0, warningCount: 0 })

// Two files with one name: an error, and nothing can be submitted
const twice = buildPcfSubmission([a, { fileName: "ISO-A.pcf", text: b.text }, b], context)
assert.equal(twice.canSubmit, false)
assert.deepEqual(twice.issues, [spoolgenIssue("DUPLICATE_FILE", null, null, { fileName: "ISO-A.pcf" })])

// One file with two lines (a weld on each) is an isometric with two line numbers
const mixed = buildPcfSubmission([{ fileName: "ISO-M.pcf", text: pcf(pipeline("L-1", "1"), pipeline("L-2", "2")) }], context)
assert.deepEqual(mixed.issues, [spoolgenIssue("ISO_MIXED_LINE", 9, "line_number", { fileName: "ISO-M.pcf", role: "weld" })])
assert.equal(mixed.canSubmit, true, "a blocker is shown after validation, it does not stop the submission")
assert.equal(mixed.summary.blockerCount, 1)

// No PDS area chosen, or no file at all: nothing to submit
const noArea = buildPcfSubmission([a], { ...context, pdsArea: "" })
assert.equal(noArea.canSubmit, false)
assert.deepEqual(noArea.issues, [spoolgenIssue("MISSING_VALUE", null, "pds_area")])
assert.equal(buildPcfSubmission([], context).canSubmit, false)

// File-level warnings and errors are counted with the file they belong to
const warned = buildPcfSubmission([{ fileName: "ISO-W.pcf", text: pcf(pipeline("L-W", "1")).replace(/\n {4}SPOOL-IDENTIFIER .*/, "") }, { fileName: "ISO-X.pcf", text: "UNITS-BORE FEET" }], context)
assert.deepEqual(warned.issues.map((issue) => [issue.code, issue.fileName, issue.severity]), [["PCF_SPOOL_FROM_FILE_NAME", "ISO-W.pcf", "warning"], ["PCF_UNKNOWN_UNITS", "ISO-X.pcf", "blocker"]])
assert.deepEqual(warned.summary, { blockerCount: 1, warningCount: 1 })
assert.equal(warned.canSubmit, true)

// Files are put in name order by code unit: the order the reader takes them in and an upload sends them in
const picked = [{ fileName: "b.pcf" }, { fileName: "a.pcf" }, { fileName: "A.pcf" }, { fileName: "ISO-1002.pcf" }, { fileName: "ISO-1001.pcf" }]
assert.deepEqual(inFileNameOrder(picked, (file) => file.fileName).map((file) => file.fileName), ["A.pcf", "ISO-1001.pcf", "ISO-1002.pcf", "a.pcf", "b.pcf"])
assert.deepEqual(picked.map((file) => file.fileName).slice(0, 2), ["b.pcf", "a.pcf"], "the list given is not reordered in place")
