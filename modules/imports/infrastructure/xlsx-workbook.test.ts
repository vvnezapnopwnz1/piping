import assert from "node:assert/strict"
import * as XLSX from "xlsx"
import { buildTemplateWorkbook, buildWorkbook, readFirstSheetMatrix, readSheetMatrix, type WorkbookSheet } from "./xlsx-workbook"

async function run() {
  const bytes = buildTemplateWorkbook("piping_material_list")
  assert.ok(bytes.byteLength > 0, "template workbook has content")

  const matrix = readFirstSheetMatrix(bytes)
  assert.deepEqual(matrix[0], ["MRR Number", "Ident Code", "Trace Number"])

  // Round-trip a data row through the same boundary.
  const withData = buildTemplateWorkbook("thickness_flange")
  const headers = readFirstSheetMatrix(withData)[0]
  assert.deepEqual(headers, ["Service Class", "Dia Inch", "Thickness", "Flange Rating"])

  // A date typed into Excel is stored as a serial number with a date format. The importer must see the
  // date the user typed, not 46266, whatever the time zone of the browser.
  const sheet: XLSX.WorkSheet = {
    "!ref": "A1:B3",
    A1: { t: "s", v: "Approved On" }, B1: { t: "s", v: "Note" },
    A2: { t: "n", v: 46266, z: "yyyy-mm-dd" }, B2: { t: "s", v: "2026-09-01" },
    A3: { t: "n", v: 7, z: "0" }, B3: { t: "n", v: 46266.75, z: "dd/mm/yyyy hh:mm" },
  }
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, "Data")
  const dated = readFirstSheetMatrix(XLSX.write(book, { bookType: "xlsx", type: "array" }) as Uint8Array)
  assert.deepEqual(dated[1], ["2026-09-01", "2026-09-01"], "a date cell becomes YYYY-MM-DD; a text cell is untouched")
  assert.deepEqual(dated[2], [7, "2026-09-01"], "a plain number stays a number")

  // A template carries one sheet per role next to its help and code sheets, so a role reads its own sheet.
  // The role sheet is deliberately not first: reading it by name is the behaviour under test.
  const sheets: WorkbookSheet[] = [
    { name: "trace", rows: [["IDENT_CODE"], ["PIPE100"]] },
    { name: "weld", rows: [["ISO_NUMBER", "WELD_NUMBER"], ["ISO-4001", "4001-S1-W01"]] },
    { name: "numbers", rows: [["THICKNESS_MM"], [6.02]] },
  ]
  const built = buildWorkbook(sheets)
  assert.ok(built.byteLength > 0, "a workbook built from rows has content")
  assert.deepEqual(readSheetMatrix(built, "weld"), [["ISO_NUMBER", "WELD_NUMBER"], ["ISO-4001", "4001-S1-W01"]], "a role reads its own sheet, not the first one")
  assert.deepEqual(readSheetMatrix(built, " WELD "), [["ISO_NUMBER", "WELD_NUMBER"], ["ISO-4001", "4001-S1-W01"]], "the sheet name is compared in any case and with padding")
  assert.deepEqual(readSheetMatrix(built, "help"), [["IDENT_CODE"], ["PIPE100"]], "a workbook without that sheet keeps the old first-sheet behaviour")
  assert.deepEqual(readFirstSheetMatrix(built), [["IDENT_CODE"], ["PIPE100"]])
  assert.deepEqual(readSheetMatrix(built, "numbers")[1], [6.02], "a number stays a number")

  // The role sheet is empty and not first: a found-but-empty sheet must not become the first sheet's rows.
  const withEmptySheet = buildWorkbook([{ name: "help", rows: [["Field"]] }, { name: "weld", rows: [] }])
  assert.deepEqual(readSheetMatrix(withEmptySheet, "weld"), [], "a found sheet with no rows reads as no rows")

  console.log("All xlsx-workbook.test.ts assertions passed!")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
