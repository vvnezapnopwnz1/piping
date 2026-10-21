import assert from "node:assert/strict"
import test from "node:test"

import { buildPcfSubmission } from "../application/import-pcf"
import type { SpoolgenSubmission } from "../application/import-spooling"
import { DEFAULT_PCF_SETTINGS } from "../domain/import-template"
import { PCF_SAMPLE, PCF_SAMPLE_FILE_NAME } from "./pcf-sample"

// The sample is what a customer compares their own export with, so it must be everything the reader accepts and
// nothing it quietly drops: units, one pipeline, parts, WELD blocks that carry a number, a place and a type.

const rowsOf = (submission: SpoolgenSubmission, kind: string) => submission.rows.filter((row) => row.normalizedValues.entity_type === kind).map((row) => row.normalizedValues)
const read = () => buildPcfSubmission([{ fileName: PCF_SAMPLE_FILE_NAME, text: PCF_SAMPLE }], { pdsArea: "A-100", settings: DEFAULT_PCF_SETTINGS })

test("the sample PCF reads as one isometric, two spools and three welds, with no issue", () => {
  const submission = read()
  assert.deepEqual(submission.issues, [])
  assert.equal(submission.canSubmit, true)
  assert.deepEqual(rowsOf(submission, "isometric").map((v) => [v.iso_number, v.revision_number, v.pds_area, v.service_class, v.line_number]), [["ISO-5001", "B", "A-100", "CS150", "4-NG-5001-CS150"]])
  assert.deepEqual(rowsOf(submission, "spool").map((v) => [v.spool_number, v.sequence_number]), [["5001-S1", "1"], ["5001-S2", "2"]])
  assert.deepEqual(rowsOf(submission, "weld_joint").map((v) => [v.spool_number, v.weld_number, v.weld_type, v.weld_location, v.diameter_inch]), [
    ["5001-S1", "1", "BW", "shop", "4"],
    ["5001-S1", "2", "BW", "field", "4"],
    ["5001-S2", "3", "BW", "shop", "4"],
  ])
  assert.equal(submission.rows.length, 6)
})

test("the sample says its units and is indented with spaces, as a PCF must be", () => {
  assert.match(PCF_SAMPLE, /^UNITS-BORE MM$/m)
  assert.match(PCF_SAMPLE, /^ {4}PIPING-SPEC CS150$/m)
  assert.doesNotMatch(PCF_SAMPLE, /\t/)
})

test("the sample names its file so the isometric number comes out as the file name", () => {
  assert.equal(PCF_SAMPLE_FILE_NAME, "ISO-5001.pcf")
  assert.equal(rowsOf(read(), "isometric")[0].iso_number, "ISO-5001")
})
