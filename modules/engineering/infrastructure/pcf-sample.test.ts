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
    ["5001-S1", "ISO-5001-1", "BW", "shop", "4"],
    ["5001-S1", "ISO-5001-2", "BW", "field", "4"],
    ["5001-S2", "ISO-5001-3", "BW", "shop", "4"],
  ])
  assert.equal(submission.rows.length, 6)
})

test("the sample says its units and is indented with spaces, the way CAD systems write a PCF", () => {
  assert.match(PCF_SAMPLE, /^UNITS-BORE MM$/m)
  assert.match(PCF_SAMPLE, /^ {4}PIPING-SPEC CS150$/m)
  assert.doesNotMatch(PCF_SAMPLE, /\t/)
})

// The reader takes no geometry, but a customer opens the sample in a viewer: a part that starts away from the one before,
// a fitting of another size, or a flange turned across its pipe shows as a broken model there.
type Part = { keyword: string; ends: number[][] }
const parts = (): Part[] => {
  const found: Part[] = []
  for (const line of PCF_SAMPLE.split("\n")) {
    if (/^[A-Z]/.test(line)) found.push({ keyword: line.split(" ")[0], ends: [] })
    const point = line.match(/^ +END-POINT (\S+) (\S+) (\S+)/)
    if (point && found.length > 0) found[found.length - 1].ends.push([Number(point[1]), Number(point[2]), Number(point[3])])
  }
  return found.filter((part) => part.ends.length > 0)
}
const tenth = (value: number) => Math.round(value * 10) / 10
const run = (part: Part) => part.ends[1].map((value, axis) => tenth(value - part.ends[0][axis]))

test("each part starts where the one before it ends, and each weld sits on that joint", () => {
  const all = parts()
  const pieces = all.filter((part) => part.keyword !== "WELD")
  for (let index = 1; index < pieces.length; index += 1) {
    assert.deepEqual(pieces[index].ends[0], pieces[index - 1].ends[1], `${pieces[index].keyword} ${index} starts where ${pieces[index - 1].keyword} ends`)
  }
  all.forEach((part, index) => {
    if (part.keyword === "WELD") assert.deepEqual(part.ends[0], all[index - 1].ends[1], `weld ${index} sits at the end of the part before it`)
  })
})

test("the DN100 long-radius elbow turns 152.4 mm each way, as the DN100 elbow of ISO-1001.pcf does", () => {
  const elbow = parts().find((part) => part.keyword === "ELBOW")!
  assert.deepEqual(run(elbow).map(Math.abs), [152.4, 152.4, 0])
})

test("the flange carries on in the direction of the pipe it is welded to", () => {
  const pieces = parts().filter((part) => part.keyword !== "WELD")
  const flange = pieces.findIndex((part) => part.keyword === "FLANGE")
  assert.deepEqual(run(pieces[flange]).map(Math.sign), run(pieces[flange - 1]).map(Math.sign))
})

test("the sample names its file so the isometric number comes out as the file name", () => {
  assert.equal(PCF_SAMPLE_FILE_NAME, "ISO-5001.pcf")
  assert.equal(rowsOf(read(), "isometric")[0].iso_number, "ISO-5001")
})
