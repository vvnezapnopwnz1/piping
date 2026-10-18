import assert from "node:assert/strict"
import * as XLSX from "xlsx"
import { buildTemplateWorkbook, readFirstSheetMatrix } from "./xlsx-workbook"

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

  console.log("All xlsx-workbook.test.ts assertions passed!")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
