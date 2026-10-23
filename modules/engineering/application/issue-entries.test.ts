import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import type { StoredImportIssue } from "@/modules/imports/domain/stored-import-issue"
import { buildWorkbook, readNumberedSheets } from "@/modules/imports/infrastructure/xlsx-workbook"
import type { SpoolgenFileRole } from "../domain/spoolgen-file"
import { spoolgenIssue } from "../domain/spoolgen-issue"
import { DEFAULT_PCF_SETTINGS } from "../domain/import-template"
import { buildPcfSubmission } from "./import-pcf"
import { buildTableSubmission, readWorkbookUpload, type TableSource } from "./import-table"
import { buildIssueEntries, countIssueEntries } from "./issue-entries"
import type { SpoolgenSubmission } from "./import-spooling"

// Every submission here is read the way the Excel tile reads a workbook: each row of a sheet keeps the number Excel
// prints beside it, so a test can say "row 45" and mean the row a person sees.
const WELD_HEADER = ["ISO_NUMBER", "ISO_REVISION", "PDS_AREA", "SERVICE_CLASS", "SPOOL_NUMBER", "WELD_NUMBER", "WELD_TYPE", "DIAMETER_INCH"]
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index)
const weld = (iso: string, spool: string, weldNumber: string, overrides: { pds?: string; serviceClass?: string; weldType?: string } = {}) => [iso, "R0", overrides.pds ?? "Z-999", overrides.serviceClass ?? "CS150", spool, weldNumber, overrides.weldType ?? "BW", 4]
/** A sheet whose header is in row 1 and whose data rows sit at the given Excel rows. */
const sheet = (role: SpoolgenFileRole, header: unknown[], rows: readonly (readonly [number, unknown[]])[]): TableSource =>
  ({ role, fileName: "book.xlsx", sheet: role, matrix: [header, ...rows.map(([, cells]) => cells)], rowNumbers: [1, ...rows.map(([row]) => row)] })
const submit = (...sources: TableSource[]) => buildTableSubmission(sources)
const stored = (code: string, rowNumber: number | null, columnName: string | null, severity: StoredImportIssue["severity"] = "blocker"): StoredImportIssue => ({ code, rowNumber, columnName, severity, message: "m", fileName: null })
const stagingRow = (submission: SpoolgenSubmission, kind: string, key: string, value: string) => {
  const found = submission.rows.find((row) => row.normalizedValues.entity_type === kind && row.normalizedValues[key] === value)
  assert.ok(found, `${kind} ${key}=${value}`)
  return found.rowNumber
}

test("a server error on an isometric points at every weld row of it, in Excel's numbers, as one entry", () => {
  // Rows 42–44 are blank, so ISO-A sits at rows 2–41 and 45.
  const rows = [...range(2, 41), 45].map((row) => [row, weld("ISO-A", "SP-1", `W-${row}`)] as const)
  const submission = submit(sheet("weld", WELD_HEADER, rows))
  const entries = buildIssueEntries(submission, [stored("SRV_PDS_MISSING", stagingRow(submission, "isometric", "iso_number", "ISO-A"), "pds_area")])
  assert.deepEqual(entries, [{ severity: "blocker", code: "SRV_PDS_MISSING", args: { pdsArea: "Z-999" }, message: "m", place: { sheet: "weld", file: null, column: "PDS_AREA", rows: [...range(2, 41), 45] } }])
})

test("two isometrics with the same unknown area are one entry with the rows of both", () => {
  const submission = submit(sheet("weld", WELD_HEADER, [[2, weld("ISO-A", "SP-1", "W-1")], [3, weld("ISO-A", "SP-1", "W-2")], [4, weld("ISO-B", "SP-2", "W-3")], [5, weld("ISO-B", "SP-2", "W-4")]]))
  const entries = buildIssueEntries(submission, [stored("SRV_PDS_MISSING", stagingRow(submission, "isometric", "iso_number", "ISO-A"), "pds_area"), stored("SRV_PDS_MISSING", stagingRow(submission, "isometric", "iso_number", "ISO-B"), "pds_area")])
  assert.deepEqual(entries.map((entry) => [entry.code, entry.args, entry.place.rows]), [["SRV_PDS_MISSING", { pdsArea: "Z-999" }, [2, 3, 4, 5]]])
})

test("a weld error points at its row and a spool error at the rows of its spool", () => {
  const submission = submit(sheet("weld", WELD_HEADER, [[2, weld("ISO-A", "SP-1", "W-1")], [3, weld("ISO-A", "SP-1", "W-2")], [4, weld("ISO-A", "SP-2", "W-3", { weldType: "XX" })]]))
  const spoolRow = submission.rows.find((row) => row.normalizedValues.entity_type === "spool" && row.normalizedValues.spool_number === "SP-1")!.rowNumber
  const entries = buildIssueEntries(submission, [stored("SRV_WELD_TYPE_MISSING", stagingRow(submission, "weld_joint", "weld_number", "W-3"), "weld_type"), { ...stored("SRV_X", spoolRow, "spool_number"), message: "A check the app does not know" }])
  // Both are errors on the weld sheet, so the first row decides the order.
  assert.deepEqual(entries.map((entry) => [entry.code, entry.args, entry.message, entry.place]), [
    ["SRV_X", {}, "A check the app does not know", { sheet: "weld", file: null, column: "SPOOL_NUMBER", rows: [2, 3] }],
    ["SRV_WELD_TYPE_MISSING", { weldType: "XX" }, "m", { sheet: "weld", file: null, column: "WELD_TYPE", rows: [4] }],
  ])
})

test("a problem the browser and the server both find is listed once", () => {
  const welds = sheet("weld", WELD_HEADER, [[2, weld("ISO-A", "SP-1", "W-1")], [3, weld("ISO-A", "SP-1", "W-2", { serviceClass: "SS316" })]])
  const trace = sheet("trace", ["ISO_NUMBER", "SPOOL_NUMBER", "IDENT_CODE"], [[2, ["ISO-A", "SP-1", "PIPE"]], [5, ["ISO-A", "SP-9", "PIPE"]]])
  const submission = submit(welds, trace)
  assert.deepEqual(submission.issues.map((issue) => issue.code).sort(), ["ISO_MIXED_SERVICE_CLASS", "ORPHAN_SPOOL"])
  const orphanRow = stagingRow(submission, "material", "spool_number", "SP-9")
  const entries = buildIssueEntries(submission, [stored("SRV_ORPHAN_SPOOL", orphanRow, "spool_number"), stored("SRV_ISO_MIXED_SERVICE_CLASS", null, "service_class"), stored("SRV_ISO_MIXED_LINE", null, "line_number")])
  assert.deepEqual(entries.map((entry) => [entry.code, entry.args, entry.place]), [
    // The server's twin without a row has nothing the browser did not say: it is left out when the browser said it.
    ["SRV_ISO_MIXED_LINE", {}, { sheet: null, file: null, column: null, rows: [] }],
    ["ISO_MIXED_SERVICE_CLASS", { iso: "ISO-A" }, { sheet: "weld", file: null, column: "SERVICE_CLASS", rows: [2, 3] }],
    ["ORPHAN_SPOOL", { iso: "ISO-A", spool: "SP-9" }, { sheet: "trace", file: null, column: "SPOOL_NUMBER", rows: [5] }],
  ])
})

test("the same row number on two sheets stays on its own sheet", () => {
  const welds = sheet("weld", WELD_HEADER, [[2, weld("ISO-A", "SP-1", "W-1")]])
  const trace = sheet("trace", ["ISO_NUMBER", "SPOOL_NUMBER", "IDENT_CODE"], [[5, ["ISO-A", "SP-9", "PIPE"]]])
  const bolt = sheet("bolt", ["ISO_NUMBER", "SPOOL_NUMBER", "FLANGE_NUMBER"], [[5, ["ISO-A", "SP-9", "F-1"]]])
  const entries = buildIssueEntries(submit(welds, trace, bolt), [])
  assert.deepEqual(entries.map((entry) => [entry.code, entry.place.sheet, entry.place.rows]), [["ORPHAN_SPOOL", "trace", [5]], ["ORPHAN_SPOOL", "bolt", [5]]])
})

test("errors come before warnings, whole-upload entries first, and the count is per entry", () => {
  const submission = submit(sheet("weld", WELD_HEADER, [[2, weld("ISO-A", "SP-1", "W-1", { weldType: "XX" })], [3, weld("ISO-A", "SP-1", "W-2", { weldType: "XX" })], [4, weld("ISO-A", "SP-1", "W-3", { weldType: "XX" })]]))
  const weldRows = ["W-1", "W-2", "W-3"].map((number) => stagingRow(submission, "weld_joint", "weld_number", number))
  const entries = buildIssueEntries(submission, [
    stored("SRV_WPS_MISSING", weldRows[0], "weld_number", "warning"),
    ...weldRows.map((row) => stored("SRV_WELD_TYPE_MISSING", row, "weld_type")),
    stored("SRV_SPOOLING_SPINE_MISSING", null, null),
  ])
  assert.deepEqual(entries.map((entry) => entry.code), ["SRV_SPOOLING_SPINE_MISSING", "SRV_WELD_TYPE_MISSING", "SRV_WPS_MISSING"])
  assert.deepEqual(entries[1].place.rows, [2, 3, 4])
  assert.deepEqual(entries[2].args, { diameter: "4", thickness: "", hasThickness: "no" })
  assert.deepEqual(countIssueEntries(entries), { errors: 2, warnings: 1 })
})

test("the job-size error counts the welds this file sent", () => {
  const submission = submit(sheet("weld", WELD_HEADER, [[2, weld("ISO-A", "SP-1", "W-1")], [3, weld("ISO-A", "SP-1", "W-2")], [4, weld("ISO-B", "SP-1", "W-3")]]))
  assert.deepEqual(buildIssueEntries(submission, [stored("SRV_SPOOLING_JOB_TOO_LARGE", null, null)])[0].args, { count: 3 })
})

test("a workbook with a blank row between the data names the Excel row of the error after it", () => {
  const bytes = buildWorkbook([{ name: "weld", rows: [WELD_HEADER, weld("ISO-A", "SP-1", "W-1"), [], weld("ISO-A", "SP-1", "")] }])
  const reading = readWorkbookUpload("book.xlsx", readNumberedSheets(bytes, ["weld"]))
  assert.equal(reading.kind, "ready")
  if (reading.kind !== "ready") return
  assert.deepEqual(buildIssueEntries(reading.submission, []).map((entry) => [entry.code, entry.args, entry.place.sheet, entry.place.column, entry.place.rows]), [["MISSING_VALUE", { column: "WELD_NUMBER" }, "weld", "WELD_NUMBER", [4]]])
})

test("a PCF issue without a record keeps its file and line", () => {
  const submission = submit(sheet("weld", WELD_HEADER, [[2, weld("ISO-A", "SP-1", "W-1")]]))
  const pcf = { ...submission, issues: [spoolgenIssue("PCF_BORE_UNKNOWN", 12, "diameter_inch", { fileName: "ISO-1.pcf", severity: "warning" })] }
  assert.deepEqual(buildIssueEntries(pcf, []).map((entry) => entry.place), [{ sheet: null, file: "ISO-1.pcf", column: null, rows: [12] }])
})

test("a SpoolGen text file is named in place of a sheet, and a whole-file issue has no row", () => {
  const text: TableSource = { role: "weld", fileName: "weld.txt", matrix: [WELD_HEADER, weld("ISO-A", "SP-1", "W-1", { pds: "" })] }
  const empty: TableSource = { role: "supp", fileName: "supp.txt", matrix: [] }
  const entries = buildIssueEntries(submit(text, empty), [])
  assert.deepEqual(entries.map((entry) => [entry.code, entry.place]), [
    ["EMPTY_FILE", { sheet: null, file: "supp.txt", column: null, rows: [] }],
    ["MISSING_VALUE", { sheet: null, file: "weld.txt", column: "PDS_AREA", rows: [1] }],
  ])
})

test("a PCF issue names the field it misses, one entry per field", () => {
  const text = readFileSync(new URL("../../../fixtures/import-samples/aveva/ISO-1001.pcf", import.meta.url), "utf8").replace(/^\s*PIPING-SPEC .*\r?\n/m, "")
  const submission = buildPcfSubmission([{ fileName: "ISO-1001.pcf", text }], { pdsArea: "A-100", settings: DEFAULT_PCF_SETTINGS })
  const entries = buildIssueEntries(submission, [])
  assert.deepEqual(entries.map((entry) => [entry.code, entry.args, entry.place.file, entry.place.column]), [["MISSING_VALUE", { column: "SERVICE_CLASS" }, "ISO-1001.pcf", "SERVICE_CLASS"]])
  assert.equal(entries[0].place.rows.length, 8)
})

test("seven and a half thousand welds with one error each are one entry, built without a pause", () => {
  const rows = range(2, 7501).map((row) => [row, weld(`ISO-${Math.floor(row / 50)}`, `SP-${Math.floor(row / 50)}`, `W-${row}`, { weldType: "XX" })] as const)
  const submission = submit(sheet("weld", WELD_HEADER, rows))
  const stored = submission.rows.filter((row) => row.normalizedValues.entity_type === "weld_joint").map((row) => ({ code: "SRV_WELD_TYPE_MISSING", rowNumber: row.rowNumber, columnName: "weld_type", severity: "blocker" as const, message: "m", fileName: null }))
  const started = performance.now()
  const entries = buildIssueEntries(submission, stored)
  const elapsed = performance.now() - started
  assert.deepEqual(entries.map((entry) => [entry.code, entry.place.rows.length]), [["SRV_WELD_TYPE_MISSING", 7500]])
  // Merging row by row re-sorted the growing list each time: about 1.5 s here, a frozen screen at the joint limit.
  assert.ok(elapsed < 400, `${Math.round(elapsed)} ms`)
})

test("a weld number used again in an isometric is one error entry naming the number, a same-data repeat a warning", () => {
  const entries = buildIssueEntries(
    submit(sheet("weld", WELD_HEADER, [
      [2, weld("ISO-1", "S-1", "W-1")],
      [3, weld("ISO-1", "S-1", "W-1")],
      [4, weld("ISO-1", "S-2", "W-1")],
      [5, weld("ISO-1", "S-1", "W-2")],
    ])),
    [],
  )
  const duplicates = entries.filter((entry) => entry.code.startsWith("NUMBER_DUPLICATE"))
  assert.deepEqual(duplicates.map((entry) => [entry.severity, entry.code, entry.args, entry.place.rows]), [
    ["blocker", "NUMBER_DUPLICATE", { kind: "weld", number: "W-1" }, [4]],
    ["warning", "NUMBER_DUPLICATE_SAME", { kind: "weld", number: "W-1" }, [3]],
  ])
  assert.equal(duplicates[0].place.sheet, "weld")
  assert.equal(duplicates[0].place.column, "WELD_NUMBER")
})

test("one weld number in two isometrics, and one spool number in two isometrics, are errors that name what is repeated", () => {
  const entries = buildIssueEntries(
    submit(sheet("weld", WELD_HEADER, [
      [2, weld("ISO-1", "S-1", "W-1")],
      [3, weld("ISO-2", "S-1", "W-1")],
    ])),
    [],
  )
  assert.deepEqual(
    entries.filter((entry) => entry.code === "NUMBER_IN_OTHER_ISO").map((entry) => [entry.args, entry.place.column, entry.place.rows]),
    [[{ kind: "weld", number: "W-1" }, "WELD_NUMBER", [3]], [{ kind: "spool", number: "S-1" }, "SPOOL_NUMBER", [3]]],
  )
})

test("an isometric with two PDS areas is one entry naming the isometric, at every row of it", () => {
  const entries = buildIssueEntries(
    submit(sheet("weld", WELD_HEADER, [
      [2, weld("ISO-1", "S-1", "W-1", { pds: "A-1" })],
      [3, weld("ISO-1", "S-1", "W-2", { pds: "A-2" })],
    ])),
    [],
  )
  assert.deepEqual(entries.filter((entry) => entry.code === "ISO_MIXED_PDS_AREA").map((entry) => [entry.args, entry.place.rows]), [[{ iso: "ISO-1" }, [2, 3]]])
})
