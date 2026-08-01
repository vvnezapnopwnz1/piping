import assert from "node:assert/strict"
import { SPOOLGEN_CONTRACT, normalizeHeader, numericKeysFor, requiredKeysFor, resolveColumns } from "./spoolgen-contract"

assert.equal(normalizeHeader("ISO No."), "ISONO")
assert.equal(normalizeHeader("  iso_number "), "ISONUMBER")
assert.equal(normalizeHeader("Diameter (inch)"), "DIAMETERINCH")
assert.ok(SPOOLGEN_CONTRACT.weld.some((column) => column.key === "weld_number"))
const resolved = resolveColumns("weld", ["ISO No.", "Rev", "PDS Area", "Service Class", "Spool No.", "Weld No.", "Weld Type", "Diameter (inch)", "Thickness (mm)"])
assert.deepEqual(resolved.missingRequired, [])
assert.equal(resolved.indexes.get("weld_number"), 5)
assert.equal(resolved.indexes.get("thickness_mm"), 8)
assert.ok(resolveColumns("weld", ["ISO No.", "Spool No."]).missingRequired.includes("revision_number"))
assert.deepEqual(numericKeysFor("supp"), ["quantity"])
assert.ok(requiredKeysFor("trace").includes("ident_code"))
