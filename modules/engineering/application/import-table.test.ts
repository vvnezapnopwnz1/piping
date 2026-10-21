import assert from "node:assert/strict"
import test from "node:test"

import { en } from "@/i18n/messages"
import { SPOOLGEN_CONTRACT } from "../domain/spoolgen-contract"
import { SPOOLGEN_FILE_ROLES } from "../domain/spoolgen-file"
import { parseDelimited } from "../domain/parsers/delimited"
import { buildSpoolgenSubmission } from "./import-spooling"
import type { TableTemplateSettings } from "../domain/import-template"
import { applyColumnDrafts, buildTableSubmission, columnMapOf, describeTableColumns, hasMappedColumn, mergeColumnMaps, withColumnChoice, type TableSource } from "./import-table"

const HEADERS = ["Изометрия", "Ревизия", "Зона", "Класс", "Катушка", "Шов", "Тип", "Диаметр"]
const register: TableSource = { role: "weld", fileName: "register.xlsx", matrix: [HEADERS, ["ISO-1", "R0", "PDS-A", "SC-01", "SP-1", "W-1", "BW", 6]] }
const MAPPING = { weld: { iso_number: "Изометрия", revision_number: "Ревизия", pds_area: "Зона", service_class: "Класс", spool_number: "Катушка", weld_number: "Шов", weld_type: "Тип", diameter_inch: "Диаметр" } }
const entityRows = (rows: readonly { normalizedValues: Record<string, string> }[], kind: string) => rows.filter((row) => row.normalizedValues.entity_type === kind)

test("a Russian register read through a column mapping gives one weld and no issues", () => {
  const submission = buildTableSubmission([register], { kind: "table", columns: MAPPING })
  assert.deepEqual(submission.issues, [])
  assert.deepEqual(submission.missingColumns, {})
  assert.equal(submission.canSubmit, true)
  const welds = entityRows(submission.rows, "weld_joint")
  assert.equal(welds.length, 1)
  assert.equal(welds[0].normalizedValues.weld_number, "W-1")
  assert.equal(welds[0].normalizedValues.diameter_inch, "6")
})

test("without a mapping the unmatched required columns are listed with the file's headers, and nothing can be sent", () => {
  const submission = buildTableSubmission([register], { kind: "table", columns: {} })
  assert.equal(submission.canSubmit, false)
  assert.deepEqual(submission.missingColumns.weld?.find((column) => column.key === "weld_number"), { key: "weld_number", headers: HEADERS })
  assert.deepEqual(submission.missingColumns.weld?.map((column) => column.key), ["pds_area", "service_class", "weld_number", "weld_type", "diameter_inch"])
  assert.ok(submission.issues.every((issue) => issue.code === "MISSING_COLUMN" && issue.fileName === "register.xlsx"))
})

test("records and issues carry the name of the file they come from", () => {
  const blank = { ...register, matrix: [HEADERS, ["ISO-1", "R0", "PDS-A", "SC-01", "SP-1", "", "BW", 6]] }
  const empty: TableSource = { role: "supp", fileName: "supports.csv", matrix: [] }
  const submission = buildTableSubmission([empty, blank], { kind: "table", columns: MAPPING })
  assert.deepEqual(submission.issues.map((issue) => [issue.code, issue.fileName, issue.columnName]), [["MISSING_VALUE", "register.xlsx", "weld_number"], ["EMPTY_FILE", "supports.csv", "supp"]])
  assert.equal(submission.canSubmit, true)
})

test("without a weld file nothing can be sent", () => {
  const trace: TableSource = { role: "trace", fileName: "trace.csv", matrix: [["ISO_NUMBER", "SPOOL_NUMBER", "IDENT_CODE"], ["ISO-1", "SP-1", "ID-1"]] }
  const submission = buildTableSubmission([trace], { kind: "table", columns: {} })
  assert.equal(submission.canSubmit, false)
  assert.deepEqual(submission.issues.map((issue) => [issue.code, issue.columnName]), [["MISSING_REQUIRED_FILE", "weld"], ["ORPHAN_SPOOL", "spool_number"]])
})

test("the four SpoolGen files give the same rows as the SpoolGen reader the scripts use", () => {
  const texts = {
    weld: "ISO_NUMBER\tISO_REVISION\tPDS_AREA\tSERVICE_CLASS\tSPOOL_NUMBER\tWELD_NUMBER\tWELD_TYPE\tDIAMETER_INCH\tTHICKNESS_MM\nISO-1\tR0\tPDS-A\tSC-01\tSP-1\tW-1\tBW\t6\t7,11\nISO-1\tR0\tPDS-A\tSC-01\tSP-2\tW-2\tBW\t6\t7,11\n",
    supp: "ISO_NUMBER\tSPOOL_NUMBER\tSUPPORT_NUMBER\nISO-1\tSP-2\tS-1\n",
  }
  const sources: TableSource[] = (["supp", "weld"] as const).map((role) => ({ role, fileName: `${role}.txt`, matrix: parseDelimited(texts[role]) }))
  const submission = buildTableSubmission(sources, { kind: "table", columns: {} })
  assert.deepEqual(submission.rows, buildSpoolgenSubmission(texts).rows)
  assert.equal(submission.canSubmit, true)
})

test("the mapping editor is offered every field of the role, with the header each one is read from now", () => {
  const described = describeTableColumns(register, { diameter_inch: "Диаметр" })
  assert.deepEqual(described.headers, HEADERS)
  assert.deepEqual(described.columns.map((column) => column.key), SPOOLGEN_CONTRACT.weld.map((column) => column.key))
  const byKey = new Map(described.columns.map((column) => [column.key, column]))
  assert.deepEqual(byKey.get("iso_number"), { key: "iso_number", required: true, header: "Изометрия" })
  assert.deepEqual(byKey.get("diameter_inch"), { key: "diameter_inch", required: true, header: "Диаметр" })
  assert.deepEqual(byKey.get("weld_number"), { key: "weld_number", required: true, header: null })
  assert.deepEqual(byKey.get("thickness_mm"), { key: "thickness_mm", required: false, header: null })
})

test("the file's headers are offered once each, without cells no field can match", () => {
  const described = describeTableColumns({ role: "weld", fileName: "a.csv", matrix: [["Шов", "", " Шов ", "№", 2026]] })
  assert.deepEqual(described.headers, ["Шов", "2026"])
})

test("an open editor starts from, and Check again applies, the header each field is read from now", () => {
  const shown = columnMapOf(describeTableColumns(register, { weld_number: "Шов" }).columns)
  assert.deepEqual(shown, { iso_number: "Изометрия", revision_number: "Ревизия", spool_number: "Катушка", weld_number: "Шов" })
})

test("saving a template first applies what the open editors show, the way Check again does", () => {
  const settings: TableTemplateSettings = { kind: "table", columns: { trace: { ident_code: "Код" }, weld: { weld_number: "Номер" } } }
  const toSave = applyColumnDrafts(settings, { weld: MAPPING.weld })
  assert.deepEqual(toSave, { kind: "table", columns: { trace: { ident_code: "Код" }, weld: MAPPING.weld } })
  assert.equal(buildTableSubmission([register], toSave).canSubmit, true, "the saved template reads the register on the next upload")
  assert.deepEqual(settings.columns.weld, { weld_number: "Номер" }, "the applied settings are not changed in place")
  assert.equal(applyColumnDrafts(settings, {}), settings)
})

test("a template with no mapped column is not worth saving", () => {
  assert.equal(hasMappedColumn({ kind: "table", columns: {} }), false)
  assert.equal(hasMappedColumn({ kind: "table", columns: { weld: {} } }), false)
  assert.equal(hasMappedColumn(applyColumnDrafts({ kind: "table", columns: {} }, { weld: { weld_number: "Шов" } })), true)
})

test("checking again keeps the saved mapping of a column this file does not have", () => {
  const settings: TableTemplateSettings = { kind: "table", columns: { weld: { weld_number: "Шов" } } }
  const source: TableSource = { role: "weld", fileName: "new.csv", matrix: [["Изометрия", "№ шва"], ["ISO-9", "W-1"]] }
  const shown = columnMapOf(describeTableColumns(source, settings.columns.weld).columns)
  assert.equal(shown.weld_number, undefined, "the editor shows no column for a field the file does not have")
  const merged = mergeColumnMaps(settings.columns.weld ?? {}, shown)
  assert.equal(merged.weld_number, "Шов", "the earlier mapping is alive")
  assert.equal(merged.iso_number, "Изометрия", "what the file offers comes from the draft")
  const applied = applyColumnDrafts(settings, { weld: shown })
  assert.equal(applied.columns.weld?.weld_number, "Шов", "Check again and the saved template both keep it")
  assert.deepEqual(settings.columns.weld, { weld_number: "Шов" }, "the earlier settings are not changed in place")
})

test("choosing 'not in the file' is the one way to take a saved mapping away", () => {
  assert.deepEqual(withColumnChoice({ iso_number: "Изометрия" }, "weld_number", "Шов"), { iso_number: "Изометрия", weld_number: "Шов" })
  const removed = withColumnChoice({ weld_number: "Шов" }, "weld_number", null)
  assert.deepEqual(mergeColumnMaps({ weld_number: "Шов", spool_number: "Катушка" }, removed), { spool_number: "Катушка" })
  const settings: TableTemplateSettings = { kind: "table", columns: { weld: { weld_number: "Шов" } } }
  const applied = applyColumnDrafts(settings, { weld: removed })
  assert.deepEqual(applied.columns.weld, {})
  assert.equal(hasMappedColumn(applied), false, "a template left with no mapped column is not worth saving")
})

// Russian has every English key of the namespace: i18n/messages.test.ts holds that for `spooling`.
test("every contract field has a label for the mapping editor", () => {
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
