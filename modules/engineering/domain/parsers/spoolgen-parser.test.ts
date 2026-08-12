import assert from "node:assert/strict"
import { parseSpoolgenFile } from "./spoolgen-parser"

const header = "ISO_NUMBER\tISO_REVISION\tPDS_AREA\tSERVICE_CLASS\tSPOOL_NUMBER\tWELD_NUMBER\tWELD_TYPE\tDIAMETER_INCH\tTHICKNESS_MM"
const good = parseSpoolgenFile("weld", `${header}\nISO-A\tR0\tPDS-A\tSC-A\tSP-1\tW-1\tBW\t6\t8.2\n`)
assert.equal(good.issues.length, 0)
assert.equal(good.records[0].values.thickness_mm, "8.2")
assert.equal(parseSpoolgenFile("weld", "").issues[0].code, "EMPTY_FILE")
assert.ok(parseSpoolgenFile("weld", "ISO_NUMBER\tSPOOL_NUMBER\nISO-A\tSP-1\n").issues.some((issue) => issue.code === "MISSING_COLUMN"))
const missing = parseSpoolgenFile("weld", `${header}\nISO-A\tR0\tPDS-A\tSC-A\tSP-1\t\tBW\t6\t8.2`)
assert.equal(missing.issues.find((issue) => issue.code === "MISSING_VALUE")?.columnName, "weld_number")
assert.equal(parseSpoolgenFile("weld", `${header}\nISO-A\tR0\tPDS-A\tSC-A\tSP-1\tW-1\tBW\tsix\t8.2`).issues.find((issue) => issue.code === "INVALID_NUMBER")?.columnName, "diameter_inch")
assert.equal(parseSpoolgenFile("supp", "ISO_NUMBER\tSPOOL_NUMBER\tSUPPORT_NUMBER\nISO-A\tSP-1\tSU-1").records[0].values.support_type, "")
