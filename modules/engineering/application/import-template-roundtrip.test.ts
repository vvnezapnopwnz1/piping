import assert from "node:assert/strict"
import test from "node:test"
import { createTranslator } from "next-intl"
import { messagesFor } from "@/i18n/messages"
import { buildWorkbook, readNumberedSheets } from "@/modules/imports/infrastructure/xlsx-workbook"
import { DEFAULT_PCF_SETTINGS, type ImportReferences } from "../domain/import-template"
import { SPOOLGEN_FILE_ROLES, type SpoolgenFileRole } from "../domain/spoolgen-file"
import { buildTemplateText } from "../infrastructure/import-template-files"
import { PCF_SAMPLE, PCF_SAMPLE_FILE_NAME } from "../infrastructure/pcf-sample"
import { tableTemplateSheets } from "../ui/import-template-sheets"
import { buildPcfSubmission } from "./import-pcf"
import { buildSpoolgenSubmission, type SpoolgenSubmission } from "./import-spooling"
import { readWorkbookUpload } from "./import-table"

// What the tiles hand out is what the import reads. Every file below is built by the screen's own code, then run
// through the readers and builders the upload uses: a column renamed, a note row left in a data sheet, a sheet name
// translated, or a sample that stops being read fails here, before a person ever downloads it.
// The codes the sheet lists are not read back; an empty project is enough to prove the sheets are ignored.
const REFERENCES: ImportReferences = { pdsAreas: ["A-100"], serviceClasses: ["CS150"], weldTypes: ["BW", "SW"] }
const translatorFor = (locale: "en" | "ru") => createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })

const rowsOf = (submission: SpoolgenSubmission, kind: string) => submission.rows.filter((row) => row.normalizedValues.entity_type === kind).map((row) => row.normalizedValues)

const WELD = ["ISO-4001", "ISO-4001-S1", "4001-S1-W01", "BW", "shop", "4", "6.02"]

for (const locale of ["en", "ru"] as const) {
  test(`the downloaded workbook uploads in one pick with all four sheets and no issue (${locale})`, () => {
    const bytes = buildWorkbook(tableTemplateSheets(translatorFor(locale), REFERENCES))
    const reading = readWorkbookUpload("spooling-template.xlsx", readNumberedSheets(bytes, SPOOLGEN_FILE_ROLES))
    assert.equal(reading.kind, "ready", locale)
    if (reading.kind !== "ready") return
    const { submission } = reading
    assert.deepEqual(submission.issues, [], locale)
    assert.equal(submission.canSubmit, true, locale)
    // One isometric, one spool, one weld, one support, one flange joint and one material row.
    assert.equal(submission.rows.length, 6, locale)
    assert.deepEqual(rowsOf(submission, "weld_joint").map((v) => [v.iso_number, v.spool_number, v.weld_number, v.weld_type, v.weld_location, v.diameter_inch, v.thickness_mm]), [WELD], locale)
    assert.deepEqual(rowsOf(submission, "isometric").map((v) => [v.iso_number, v.revision_number, v.pds_area, v.service_class, v.line_number]), [["ISO-4001", "R0", "A-100", "CS150", "4-NG-4001-CS150"]], locale)
    // Every row points at the sheet and the Excel row it came from.
    assert.deepEqual(submission.rowSources.flat().map((record) => [record.sheet, record.lineNumber]).filter(([sheet]) => sheet !== "weld"), [["supp", 2], ["bolt", 2], ["trace", 2]], locale)
  })
}

test("the help and the codes sheets are never read as data", () => {
  const read = readNumberedSheets(buildWorkbook(tableTemplateSheets(translatorFor("en"), REFERENCES)), SPOOLGEN_FILE_ROLES)
  assert.deepEqual(Object.keys(read).sort(), [...SPOOLGEN_FILE_ROLES].sort())
  // A note inside a data sheet would be read as a data row: each role sheet holds the header and one example row.
  for (const role of SPOOLGEN_FILE_ROLES) assert.deepEqual(read[role]?.rowNumbers, [1, 2], role)
})

test("the four SpoolGen files upload together with no issue", () => {
  const files = Object.fromEntries(SPOOLGEN_FILE_ROLES.map((role) => [role, buildTemplateText(role)])) as Record<SpoolgenFileRole, string>
  const submission = buildSpoolgenSubmission(files)
  assert.deepEqual(submission.issues, [])
  assert.equal(submission.canSubmit, true)
  assert.equal(submission.rows.length, 6)
  assert.deepEqual(rowsOf(submission, "weld_joint").map((v) => [v.iso_number, v.spool_number, v.weld_number, v.weld_type, v.weld_location, v.diameter_inch, v.thickness_mm]), [WELD])
})

test("one SpoolGen file alone still uploads: the weld file is the only required one", () => {
  const submission = buildSpoolgenSubmission({ weld: buildTemplateText("weld") })
  assert.deepEqual(submission.issues, [])
  assert.equal(submission.canSubmit, true)
  assert.equal(submission.rows.length, 3)
})

test("the sample PCF reads with no issue", () => {
  const submission = buildPcfSubmission([{ fileName: PCF_SAMPLE_FILE_NAME, text: PCF_SAMPLE }], { pdsArea: "A-100", settings: DEFAULT_PCF_SETTINGS })
  assert.deepEqual(submission.issues, [])
  assert.equal(submission.canSubmit, true)
  assert.deepEqual(rowsOf(submission, "weld_joint").map((v) => [v.spool_number, v.weld_number, v.weld_type, v.weld_location, v.diameter_inch]), [
    ["5001-S1", "ISO-5001-1", "BW", "shop", "4"],
    ["5001-S1", "ISO-5001-2", "BW", "field", "4"],
    ["5001-S2", "ISO-5001-3", "BW", "shop", "4"],
  ])
})
