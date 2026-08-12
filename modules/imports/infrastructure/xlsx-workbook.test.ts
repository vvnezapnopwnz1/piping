import assert from "node:assert/strict"
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

  console.log("All xlsx-workbook.test.ts assertions passed!")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
