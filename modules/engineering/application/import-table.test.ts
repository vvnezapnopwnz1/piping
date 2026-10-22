import assert from "node:assert/strict"
import test from "node:test"

import { en } from "@/i18n/messages"
import { SPOOLGEN_CONTRACT } from "../domain/spoolgen-contract"
import { SPOOLGEN_FILE_ROLES } from "../domain/spoolgen-file"
import { parseDelimited } from "../domain/parsers/delimited"
import { buildSpoolgenSubmission } from "./import-spooling"
import { buildTableSubmission, pickTableFile, readWorkbookUpload, type TableSource } from "./import-table"

const HEADERS = ["Изометрия", "Ревизия", "Зона", "Класс", "Катушка", "Шов", "Тип", "Диаметр"]
const register: TableSource = { role: "weld", fileName: "register.xlsx", matrix: [HEADERS, ["ISO-1", "R0", "PDS-A", "SC-01", "SP-1", "W-1", "BW", 6]] }
const TEMPLATE_HEADERS = ["ISO_NUMBER", "ISO_REVISION", "PDS_AREA", "SERVICE_CLASS", "SPOOL_NUMBER", "WELD_NUMBER", "WELD_TYPE", "DIAMETER_INCH"]
const entityRows = (rows: readonly { normalizedValues: Record<string, string> }[], kind: string) => rows.filter((row) => row.normalizedValues.entity_type === kind)

test("the template's headers give one weld and no issues", () => {
  const submission = buildTableSubmission([{ role: "weld", fileName: "book.xlsx", matrix: [TEMPLATE_HEADERS, ["ISO-1", "R0", "PDS-A", "SC-01", "SP-1", "W-1", "BW", 6]] }])
  assert.deepEqual(submission.issues, [])
  assert.deepEqual(submission.missingColumns, {})
  assert.equal(submission.canSubmit, true)
  const welds = entityRows(submission.rows, "weld_joint")
  assert.equal(welds.length, 1)
  assert.equal(welds[0].normalizedValues.weld_number, "W-1")
  assert.equal(welds[0].normalizedValues.diameter_inch, "6")
})

test("a missing required column is listed by its key and the weld file alone decides canSubmit", () => {
  const submission = buildTableSubmission([register])
  assert.deepEqual(submission.missingColumns.weld, ["pds_area", "service_class", "weld_number", "weld_type", "diameter_inch"])
  assert.equal(submission.canSubmit, true)
  assert.equal(buildTableSubmission([]).canSubmit, false)
})

test("a file set with a column missing can still be sent: the server reports it", () => {
  const submission = buildTableSubmission([register])
  assert.equal(submission.canSubmit, true)
  assert.ok(submission.issues.length > 0 && submission.issues.every((issue) => issue.code === "MISSING_COLUMN" && issue.fileName === "register.xlsx"))
})

test("records and issues carry the name of the file they come from", () => {
  const blank = { ...register, matrix: [TEMPLATE_HEADERS, ["ISO-1", "R0", "PDS-A", "SC-01", "SP-1", "", "BW", 6]] }
  const empty: TableSource = { role: "supp", fileName: "supports.csv", matrix: [] }
  const submission = buildTableSubmission([empty, blank])
  assert.deepEqual(submission.issues.map((issue) => [issue.code, issue.fileName, issue.columnName]), [["MISSING_VALUE", "register.xlsx", "weld_number"], ["EMPTY_FILE", "supports.csv", "supp"]])
  assert.equal(submission.canSubmit, true)
})

test("without a weld file nothing can be sent", () => {
  const trace: TableSource = { role: "trace", fileName: "trace.csv", matrix: [["ISO_NUMBER", "SPOOL_NUMBER", "IDENT_CODE"], ["ISO-1", "SP-1", "ID-1"]] }
  const submission = buildTableSubmission([trace])
  assert.equal(submission.canSubmit, false)
  assert.deepEqual(submission.issues.map((issue) => [issue.code, issue.columnName]), [["MISSING_REQUIRED_FILE", "weld"], ["ORPHAN_SPOOL", "spool_number"]])
})

test("the four SpoolGen files give the same rows as the SpoolGen reader the scripts use", () => {
  const texts = {
    weld: "ISO_NUMBER\tISO_REVISION\tPDS_AREA\tSERVICE_CLASS\tSPOOL_NUMBER\tWELD_NUMBER\tWELD_TYPE\tDIAMETER_INCH\tTHICKNESS_MM\nISO-1\tR0\tPDS-A\tSC-01\tSP-1\tW-1\tBW\t6\t7,11\nISO-1\tR0\tPDS-A\tSC-01\tSP-2\tW-2\tBW\t6\t7,11\n",
    supp: "ISO_NUMBER\tSPOOL_NUMBER\tSUPPORT_NUMBER\nISO-1\tSP-2\tS-1\n",
  }
  const sources: TableSource[] = (["supp", "weld"] as const).map((role) => ({ role, fileName: `${role}.txt`, matrix: parseDelimited(texts[role]) }))
  const submission = buildTableSubmission(sources)
  assert.deepEqual(submission.rows, buildSpoolgenSubmission(texts).rows)
  assert.equal(submission.canSubmit, true)
})

test("a workbook sheet gives Excel's row numbers to records and issues, and the role to each issue", () => {
  const header = ["ISO_NUMBER", "ISO_REVISION", "PDS_AREA", "SERVICE_CLASS", "SPOOL_NUMBER", "WELD_NUMBER", "WELD_TYPE", "DIAMETER_INCH"]
  const sheet: TableSource = { role: "weld", fileName: "book.xlsx", sheet: "weld", matrix: [header, ["ISO-1", "R0", "A", "C", "S-1", "W-1", "BW", 6], ["ISO-1", "R0", "A", "C", "S-1", "", "BW", 6]], rowNumbers: [1, 2, 4] }
  const submission = buildTableSubmission([sheet])
  assert.deepEqual(submission.issues.map((issue) => [issue.code, issue.rowNumber, issue.role]), [["MISSING_VALUE", 4, "weld"]])
  const welds = submission.rowSources.filter((_, index) => submission.rows[index].normalizedValues.entity_type === "weld_joint")
  assert.deepEqual(welds.map(([record]) => [record.lineNumber, record.sheet]), [[2, "weld"], [4, "weld"]])
})

const numbered = (rows: unknown[][]) => ({ rows, rowNumbers: rows.map((_, index) => index + 1) })
const WELD_SHEET = [["ISO_NUMBER", "ISO_REVISION", "PDS_AREA", "SERVICE_CLASS", "SPOOL_NUMBER", "WELD_NUMBER", "WELD_TYPE", "DIAMETER_INCH"], ["ISO-1", "R0", "A", "C", "S-1", "W-1", "BW", 6]]

test("a workbook without a weld sheet, or with an empty one, is not sent", () => {
  assert.deepEqual(readWorkbookUpload("b.xlsx", { trace: numbered([["ISO_NUMBER", "SPOOL_NUMBER", "IDENT_CODE"], ["ISO-1", "S-1", "P"]]) }), { kind: "noWeldSheet" })
  assert.deepEqual(readWorkbookUpload("b.xlsx", { weld: numbered([]) }), { kind: "noWeldSheet" })
  // The template with its example row deleted: a header and nothing under it is an empty sheet, not a job.
  assert.deepEqual(readWorkbookUpload("b.xlsx", { weld: numbered([WELD_SHEET[0]]) }), { kind: "noWeldSheet" })
})

test("a sheet without a required column names it by the template header", () => {
  const noArea = WELD_SHEET.map((row) => row.filter((_, index) => index !== 2))
  assert.deepEqual(readWorkbookUpload("b.xlsx", { weld: numbered(noArea) }), { kind: "missingColumns", sheets: [{ sheet: "weld", headers: ["PDS_AREA"] }] })
  const noIdent = numbered([["ISO_NUMBER", "SPOOL_NUMBER"], ["ISO-1", "S-1"]])
  assert.deepEqual(readWorkbookUpload("b.xlsx", { supp: numbered([["ISO_NUMBER"], ["ISO-1"]]), trace: noIdent, weld: numbered(noArea) }), { kind: "missingColumns", sheets: [{ sheet: "weld", headers: ["PDS_AREA"] }, { sheet: "trace", headers: ["IDENT_CODE"] }, { sheet: "supp", headers: ["SPOOL_NUMBER", "SUPPORT_NUMBER"] }] })
})

test("an optional sheet cleared to nothing is skipped, not an empty-file error", () => {
  const reading = readWorkbookUpload("b.xlsx", { weld: numbered(WELD_SHEET), trace: numbered([]) })
  assert.equal(reading.kind, "ready")
  assert.deepEqual(reading.kind === "ready" ? reading.submission.issues : null, [])
})

test("a file picked for a role takes its slot and says which file it replaced", () => {
  const file = (name: string, size = 10) => ({ name, size })
  const first = pickTableFile("weld", undefined, file("a.csv"), 0)
  assert.deepEqual([first.taken?.name, first.replaced], ["a.csv", undefined])
  const second = pickTableFile("weld", file("a.csv"), file("b.csv"), 0)
  assert.deepEqual([second.taken?.name, second.replaced?.name], ["b.csv", "a.csv"])
  const same = pickTableFile("weld", file("a.csv"), file("a.csv"), 0)
  assert.equal(same.replaced?.name, "a.csv", "the same name is a replacement too")
  const empty = pickTableFile("weld", file("a.csv"), file("b.csv", 0), 0)
  assert.deepEqual([empty.taken, empty.replaced, empty.refused.map((issue) => issue.code)], [undefined, undefined, ["FILE_EMPTY"]])
})

// Russian has every English key of the namespace: i18n/messages.test.ts holds that for `spooling`.
test("every contract field has a label for the help sheet", () => {
  const labels: Record<string, string> = en.spooling.mapping.fields
  for (const role of SPOOLGEN_FILE_ROLES) {
    for (const column of SPOOLGEN_CONTRACT[role]) assert.ok(labels[column.key], `${role}.${column.key}`)
  }
})

test("the four SpoolGen file roles keep their names and upload labels", () => {
  const roles = en.codes.spoolgenRole
  const uploads = en.codes.spoolgenUpload
  assert.match(roles.weld, /ISO \/ spool \/ weld structure/)
  assert.match(roles.trace, /material trace/)
  assert.match(roles.bolt, /flange and bolting/)
  assert.match(roles.supp, /supports/)
  assert.equal(uploads.weld, "Upload weld.txt")
  assert.equal(uploads.supp, "Upload supp.txt")
})
