import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { DEFAULT_PCF_SETTINGS } from "../domain/import-template"
import { decodeText } from "../infrastructure/spoolgen-file-reader"
import { buildPcfSubmission, type PcfSource } from "./import-pcf"
import type { SpoolgenSubmission } from "./import-spooling"

// The samples in fixtures/import-samples are hand-made and synthetic; their README says what each one imitates. This test
// runs them through the same builders the import screen uses and pins every derived value, so a change of a derivation
// rule has to be a conscious change of a sample or of the rule.
const samples = new URL("../../../fixtures/import-samples/", import.meta.url)
const bytesOf = (path: string) => new Uint8Array(readFileSync(new URL(path, samples)))
const pcf = (path: string): PcfSource => {
  const { text, encoding } = decodeText(bytesOf(path))
  assert.equal(encoding, "utf-8", `${path} is plain ASCII, so it reads as UTF-8`)
  return { fileName: path.slice(path.lastIndexOf("/") + 1), text }
}

const PDS_AREA = "A-100"
const context = { pdsArea: PDS_AREA, settings: DEFAULT_PCF_SETTINGS }
const aveva = [pcf("aveva/ISO-1001.pcf"), pcf("aveva/ISO-1002.pcf")]
const hexagon = [pcf("hexagon/ISO-2001.pcf")]
const plant3d = [pcf("plant3d/ISO-3001.pcf")]

const rowsOf = (submission: SpoolgenSubmission, kind: string) => submission.rows.filter((row) => row.normalizedValues.entity_type === kind).map((row) => row.normalizedValues)
type WeldTuple = [iso: string, spool: string, weld: string, type: string, location: string, diameter: string]
const weldTable = (submission: SpoolgenSubmission): WeldTuple[] => rowsOf(submission, "weld_joint").map((v) => [v.iso_number, v.spool_number, v.weld_number, v.weld_type, v.weld_location, v.diameter_inch])
const isometricTable = (submission: SpoolgenSubmission) => rowsOf(submission, "isometric").map((v) => [v.iso_number, v.revision_number, v.pds_area, v.service_class, v.line_number, v.sheet_number])
const issueTable = (submission: SpoolgenSubmission) => submission.issues.map((issue) => [issue.code, issue.severity, issue.fileName, issue.rowNumber, issue.columnName])

const ISO_1001: WeldTuple[] = [
  ["ISO-1001", "1001-SP01", "1", "BW", "shop", "6"], ["ISO-1001", "1001-SP01", "2", "BW", "shop", "6"], ["ISO-1001", "1001-SP01", "3", "BW", "field", "6"],
  ["ISO-1001", "1001-SP02", "4", "BW", "shop", "6"], ["ISO-1001", "1001-SP02", "5", "BW", "shop", "4"], ["ISO-1001", "1001-SP02", "6", "BW", "field", "4"],
  ["ISO-1001", "1001-SP03", "7", "BW", "shop", "4"], ["ISO-1001", "1001-SP03", "8", "BW", "shop", "4"],
]
const ISO_1002: WeldTuple[] = [
  ["ISO-1002", "ISO-1002", "1", "BW", "shop", "4"], ["ISO-1002", "ISO-1002", "2", "BW", "field", "4"],
  ["ISO-1002", "ISO-1002", "3", "BW", "shop", "4"], ["ISO-1002", "ISO-1002", "4", "BW", "shop", "2"],
]
const ISO_2001: WeldTuple[] = [
  ["ISO-2001", "2001-S1", "1", "BW", "shop", "2"], ["ISO-2001", "2001-S1", "2", "SW", "shop", "2"], ["ISO-2001", "2001-S1", "3", "SW", "field", "2"],
  ["ISO-2001", "2001-S2", "4", "SW", "shop", "2"], ["ISO-2001", "2001-S2", "5", "SW", "shop", "0.75"],
]
const ISO_3001: WeldTuple[] = [
  ["ISO-3001", "3001-1", "1", "BW", "shop", "6"], ["ISO-3001", "3001-1", "2", "BW", "shop", "6"], ["ISO-3001", "3001-1", "3", "BW", "field", "6"],
  ["ISO-3001", "3001-2", "4", "BW", "shop", "6"], ["ISO-3001", "3001-2", "5", "BW", "shop", "4"], ["ISO-3001", "3001-2", "6", "BW", "shop", "4"],
]

test("each sample keeps the dialect it was written to exercise", () => {
  const [iso1001, iso1002] = aveva.map((source) => source.text)
  assert.match(iso1001, /^UNITS-BORE MM$/m)
  assert.match(iso1001, /^ {4}MASTER-COMPONENT-IDENTIFIER \d+$/m)
  assert.match(iso1001, /^ {4}SKEY WS$/m)
  assert.doesNotMatch(iso1001, /WELD-TYPE/)
  assert.doesNotMatch(iso1002, /SPOOL-IDENTIFIER/)
  assert.doesNotMatch(iso1002, /MASTER-COMPONENT-IDENTIFIER/)
  const [iso2001] = hexagon.map((source) => source.text)
  assert.match(iso2001, /^UNITS-BORE INCH-SIXTEENTH$/m)
  assert.match(iso2001, /^ {4}UCI \S+$/m)
  assert.match(iso2001, /^ {4}WELD-TYPE SW$/m)
  assert.match(iso2001, /^ {4}CATEGORY ERECTION$/m)
  assert.doesNotMatch(iso2001, /^ {4}SKEY W/m, "a weld has no SKEY here, so its place comes from CATEGORY")
  const [iso3001] = plant3d.map((source) => source.text)
  assert.match(iso3001, /^UNITS-BORE INCH\r\n/m)
  assert.match(iso3001, /^PIPING-SPEC CS150\r\n/m, "pipeline attributes start at column 1")
  assert.match(iso3001, /^\tEND-POINT /m, "component attributes are indented with a tab")
  assert.doesNotMatch(iso3001, /^ /m)
})

test("AVEVA: ISO-1001 gives eight butt welds in three spools, with no issue", () => {
  const submission = buildPcfSubmission([aveva[0]], context)
  assert.deepEqual(issueTable(submission), [])
  assert.equal(submission.canSubmit, true)
  assert.deepEqual(weldTable(submission), ISO_1001)
  assert.deepEqual(isometricTable(submission), [["ISO-1001", "B", PDS_AREA, "CS150", "6-NG-1001-CS150", ""]])
  assert.deepEqual(rowsOf(submission, "spool").map((v) => v.spool_number), ["1001-SP01", "1001-SP02", "1001-SP03"])
  assert.equal(submission.rows.length, 1 + 3 + 8)
})

test("AVEVA: ISO-1002 has no SPOOL-IDENTIFIER, so its one spool is named after the file, with one warning", () => {
  const submission = buildPcfSubmission([aveva[1]], context)
  assert.deepEqual(issueTable(submission), [["PCF_SPOOL_FROM_FILE_NAME", "warning", "ISO-1002.pcf", null, "spool_number"]])
  assert.deepEqual(submission.summary, { blockerCount: 0, warningCount: 1 })
  assert.equal(submission.canSubmit, true)
  assert.deepEqual(weldTable(submission), ISO_1002)
  assert.deepEqual(isometricTable(submission), [["ISO-1002", "0", PDS_AREA, "CS150", "4-NG-1002-CS150", ""]])
  assert.equal(submission.rows.length, 1 + 1 + 4)
})

test("AVEVA: the two files together are two isometrics, four spools and twelve welds", () => {
  const submission = buildPcfSubmission(aveva, context)
  assert.deepEqual(issueTable(submission), [["PCF_SPOOL_FROM_FILE_NAME", "warning", "ISO-1002.pcf", null, "spool_number"]])
  assert.deepEqual(weldTable(submission), [...ISO_1001, ...ISO_1002])
  assert.deepEqual([rowsOf(submission, "isometric").length, rowsOf(submission, "spool").length, rowsOf(submission, "weld_joint").length], [2, 4, 12])
})

test("Hexagon: ISO-2001 reads WELD-TYPE and CATEGORY, bores in sixteenths of an inch, and a bore of 12 is 0.75", () => {
  const submission = buildPcfSubmission(hexagon, context)
  assert.deepEqual(issueTable(submission), [])
  assert.equal(submission.canSubmit, true)
  assert.deepEqual(weldTable(submission), ISO_2001)
  assert.deepEqual(isometricTable(submission), [["ISO-2001", "A", PDS_AREA, "CS300", "2-NG-2001-CS300", ""]])
  assert.deepEqual(rowsOf(submission, "spool").map((v) => v.spool_number), ["2001-S1", "2001-S2"])
})

test("Plant 3D: ISO-3001 in CRLF, tabs and inches gives its weld type from the SKEY of the part, WN through the template as BW", () => {
  const submission = buildPcfSubmission(plant3d, context)
  assert.deepEqual(issueTable(submission), [])
  assert.equal(submission.canSubmit, true)
  assert.deepEqual(weldTable(submission), ISO_3001)
  assert.deepEqual(isometricTable(submission), [["ISO-3001", "2", PDS_AREA, "CS150", "6-NG-3001-CS150", ""]])
  assert.deepEqual(rowsOf(submission, "spool").map((v) => v.spool_number), ["3001-1", "3001-2"])
})

// A sample proves a rule only if the result changes when the rule's input is taken away. Each case below removes one thing
// and names the welds that then come out differently, so the samples cannot go on passing while testing nothing.
test("the samples are sensitive to the rules they are there for", () => {
  const read = (source: PcfSource, remove?: RegExp, settings = DEFAULT_PCF_SETTINGS) => {
    if (remove !== undefined) assert.match(source.text, remove, "the sample has what the case takes away")
    return buildPcfSubmission([{ ...source, text: remove === undefined ? source.text : source.text.replace(remove, "") }], { pdsArea: PDS_AREA, settings })
  }
  const differences = (source: PcfSource, remove?: RegExp, settings = DEFAULT_PCF_SETTINGS) => {
    const before = weldTable(read(source)); const after = weldTable(read(source, remove, settings))
    return before.flatMap((row, index) => (row.join("|") === after[index].join("|") ? [] : [[row[2], ...after[index].slice(1)]]))
  }
  // MASTER-COMPONENT-IDENTIFIER: weld 3 is written after the pipe of the next spool, and only its master keeps it in the elbow's spool
  assert.deepEqual(differences(aveva[0], /^ {4}MASTER-COMPONENT-IDENTIFIER .*\n/gm), [["3", "1001-SP02", "3", "BW", "field", "6"]])
  // WELD-TYPE: a weld next to a plain pipe end would otherwise read PL, the end type of that pipe
  assert.deepEqual(differences(hexagon[0], /^ {4}WELD-TYPE .*\n/gm), [["2", "2001-S1", "2", "PL", "shop", "2"], ["4", "2001-S2", "4", "PL", "shop", "2"]])
  // CATEGORY: these welds have no SKEY, so the place of a weld is missing without it
  assert.deepEqual(read(hexagon[0], /^ {4}CATEGORY .*\n/gm).issues.map((issue) => [issue.code, issue.columnName]), Array(5).fill(["MISSING_VALUE", "weld_location"]))
  // The template's code map: the flange welds of the Plant 3D file end in WN and become BW only through it
  assert.deepEqual(differences(plant3d[0], undefined, { ...DEFAULT_PCF_SETTINGS, weldTypeByCode: {} }), [["1", "3001-1", "1", "WN", "shop", "6"], ["6", "3001-2", "6", "WN", "shop", "4"]])
  // The SKEY of the part gives the type where the file has no end type: without it every Plant 3D weld has none
  assert.deepEqual(read(plant3d[0], /^\tSKEY (FL|EL|RC)\w+\r\n/gm).issues.map((issue) => [issue.code, issue.columnName]), Array(6).fill(["MISSING_VALUE", "weld_type"]))
})

test("all four PCF files in any order give the same rows, and only the warning of ISO-1002", () => {
  const all = [...aveva, ...hexagon, ...plant3d]
  const forward = buildPcfSubmission(all, context)
  assert.deepEqual(buildPcfSubmission([...all].reverse(), context), forward)
  assert.deepEqual(buildPcfSubmission([all[2], all[0], all[3], all[1]], context), forward)
  assert.deepEqual(weldTable(forward), [...ISO_1001, ...ISO_1002, ...ISO_2001, ...ISO_3001])
  assert.deepEqual(forward.summary, { blockerCount: 0, warningCount: 1 })
  assert.equal(forward.canSubmit, true)
  assert.deepEqual([rowsOf(forward, "isometric").length, rowsOf(forward, "spool").length, rowsOf(forward, "weld_joint").length, forward.rows.length], [4, 8, 23, 35])
  assert.deepEqual(rowsOf(forward, "spool").map((v) => v.sequence_number), ["1", "2", "3", "4", "5", "6", "7", "8"])
  // Thickness is left to the server, which reads it from the project's tables.
  assert.ok(rowsOf(forward, "weld_joint").every((v) => v.thickness_mm === "" && v.service_class !== ""))
})

test("a template changes what the same files give: a class mapped from the spec, the isometric number from the pipeline", () => {
  const settings = { ...DEFAULT_PCF_SETTINGS, serviceClassBySpec: { CS150: "SC-01" }, isoNumberFrom: "pipelineReference" as const }
  const submission = buildPcfSubmission(aveva, { pdsArea: PDS_AREA, settings })
  assert.deepEqual(isometricTable(submission), [
    ["6-NG-1001-CS150", "B", PDS_AREA, "SC-01", "6-NG-1001-CS150", ""],
    ["4-NG-1002-CS150", "0", PDS_AREA, "SC-01", "4-NG-1002-CS150", ""],
  ])
  assert.deepEqual(submission.issues.map((issue) => issue.code), ["PCF_SPOOL_FROM_FILE_NAME"])
})
