import assert from "node:assert/strict"
import { parseSpoolgenFile, parseSpoolgenMatrix } from "./spoolgen-parser"

const header = "ISO_NUMBER\tISO_REVISION\tPDS_AREA\tSERVICE_CLASS\tSPOOL_NUMBER\tWELD_NUMBER\tWELD_TYPE\tDIAMETER_INCH\tTHICKNESS_MM"
const good = parseSpoolgenFile("weld", `${header}\nISO-A\tR0\tPDS-A\tSC-A\tSP-1\tW-1\tBW\t6\t8.2\n`)
assert.equal(good.issues.length, 0)
assert.equal(good.records[0].values.thickness_mm, "8.2")
assert.deepEqual(parseSpoolgenFile("weld", "").issues, [{ rowNumber: null, columnName: "weld", severity: "blocker", code: "EMPTY_FILE", message: "EMPTY_FILE" }])
assert.ok(parseSpoolgenFile("weld", "ISO_NUMBER\tSPOOL_NUMBER\nISO-A\tSP-1\n").issues.some((issue) => issue.code === "MISSING_COLUMN"))
const missing = parseSpoolgenFile("weld", `${header}\nISO-A\tR0\tPDS-A\tSC-A\tSP-1\t\tBW\t6\t8.2`)
assert.equal(missing.issues.find((issue) => issue.code === "MISSING_VALUE")?.columnName, "weld_number")
assert.equal(parseSpoolgenFile("weld", `${header}\nISO-A\tR0\tPDS-A\tSC-A\tSP-1\tW-1\tBW\tsix\t8.2`).issues.find((issue) => issue.code === "INVALID_NUMBER")?.columnName, "diameter_inch")
assert.equal(parseSpoolgenFile("supp", "ISO_NUMBER\tSPOOL_NUMBER\tSUPPORT_NUMBER\nISO-A\tSP-1\tSU-1").records[0].values.support_type, "")

const csv = "ISO_NUMBER;ISO_REVISION;PDS_AREA;SERVICE_CLASS;SPOOL_NUMBER;WELD_NUMBER;WELD_TYPE;DIAMETER_INCH;THICKNESS_MM;WELD_LOCATION\nISO-A;R0;PDS-A;SC-A;SP-1;W-1;BW;6;8,2;монтаж"
const parsed = parseSpoolgenFile("weld", csv)
assert.equal(parsed.issues.length, 0)
assert.equal(parsed.records[0].values.thickness_mm, "8.2")
assert.equal(parsed.records[0].values.weld_location, "field")
assert.equal(parsed.records[0].fileName, null)
const matrixHeader = ["ISO_NUMBER", "ISO_REVISION", "PDS_AREA", "SERVICE_CLASS", "SPOOL_NUMBER", "WELD_NUMBER", "WELD_TYPE", "DIAMETER_INCH", "THICKNESS_MM"]
const fromMatrix = parseSpoolgenMatrix("weld", [matrixHeader, ["ISO-A", "R0", "PDS-A", "SC-A", "SP-1", "W-1", "BW", 6, 8.2]])
assert.equal(fromMatrix.issues.length, 0)
assert.equal(fromMatrix.records[0].values.diameter_inch, "6")
assert.equal(fromMatrix.records[0].values.thickness_mm, "8.2")
assert.equal(fromMatrix.records[0].fileName, null)
const blanks = parseSpoolgenMatrix("weld", [matrixHeader, ["ISO-A", "R0", "PDS-A", "SC-A", "SP-1", "W-1", "BW", null, undefined], ["", "", "", "", "", "", "", "", ""]])
assert.equal(blanks.records.length, 1)
assert.equal(blanks.records[0].values.diameter_inch, "")
assert.equal(blanks.issues.some((issue) => issue.code === "MISSING_VALUE" && issue.columnName === "thickness_mm"), true)
assert.equal(parseSpoolgenMatrix("weld", [matrixHeader, ["ISO-A", "R0", "PDS-A", "SC-A", "SP-1", "W-1", "BW", "6,5", " 8,25 "]]).records[0].values.thickness_mm, "8.25")
assert.equal(parseSpoolgenMatrix("weld", [matrixHeader, ["ISO-A", "R0", "PDS-A", "SC-A", "SP-1", "1,2", "BW", "6", "8"]]).records[0].values.weld_number, "1,2")
assert.equal(parseSpoolgenMatrix("weld", [matrixHeader, ["ISO-A", "R0", "PDS-A", "SC-A", "SP-1", "W-1", "BW", "6,5,1", "8"]]).issues.some((issue) => issue.code === "INVALID_NUMBER"), true)
assert.deepEqual(parseSpoolgenMatrix("weld", []).issues.map((issue) => issue.code), ["EMPTY_FILE"])
assert.equal(parseSpoolgenMatrix("weld", [["ISO_NUMBER", "DIAMETER_INCH"], ["ISO-A", 6]]).records.length, 0)
assert.ok(parseSpoolgenMatrix("weld", [["ISO_NUMBER", "DIAMETER_INCH"], ["ISO-A", 6]]).issues.some((issue) => issue.code === "MISSING_COLUMN"))
const mapped = parseSpoolgenMatrix("weld", [["Изометрия", "Рев", "Зона", "Класс", "Катушка", "Шов", "Тип", "Ду", "Стенка"], ["ISO-A", "R0", "PDS-A", "SC-A", "SP-1", "W-1", "BW", "6", "8"]], { revision_number: "Рев", pds_area: "Зона", service_class: "Класс", weld_type: "Тип", diameter_inch: "Ду", thickness_mm: "Стенка", weld_number: "Шов" })
assert.equal(mapped.issues.length, 0)
assert.equal(mapped.records[0].values.weld_number, "W-1")
const location = (value: string) => parseSpoolgenMatrix("weld", [[...matrixHeader, "WELD_LOCATION"], ["ISO-A", "R0", "PDS-A", "SC-A", "SP-1", "W-1", "BW", "6", "8", value]]).records[0].values.weld_location
for (const [input, expected] of [["цех", "shop"], ["Заводской", "shop"], ["SHOP", "shop"], ["s", "shop"], ["монтаж", "field"], ["Монтажный", "field"], ["Field", "field"], ["F", "field"], ["site", "field"], ["Assembly", "assembly"], ["unknown", "unknown"], ["", ""]])
  assert.equal(location(input), expected, input)
