import assert from "node:assert/strict"
import { SPOOLGEN_FILE_ROLES, SPOOLGEN_MAX_FILE_BYTES, SPOOLING_MAX_FILES, addPickedFiles, checkFileSize, describeFileSet, isSpoolgenFileRole, missingRequiredRoles } from "./spoolgen-file"
import { STAGING_ENTITY_KINDS, isDecidableEntity, stagingOrderOf } from "./entity"

assert.equal(SPOOLGEN_FILE_ROLES.length, 4)
assert.equal(SPOOLGEN_MAX_FILE_BYTES, 4194304)
assert.equal(isSpoolgenFileRole("weld"), true)
assert.equal(isSpoolgenFileRole("marian"), false)
assert.deepEqual(missingRequiredRoles([]), ["weld"])
assert.deepEqual(missingRequiredRoles(["weld"]), [])
assert.deepEqual(describeFileSet(["weld", "trace"]), { complete: false, missingRequired: [], optionalMissing: ["bolt", "supp"] })
assert.equal(describeFileSet(["weld", "trace", "bolt", "supp"]).complete, true)
assert.equal(checkFileSize("weld", "weld.txt", 1024), null)
assert.deepEqual(checkFileSize("weld", "weld.txt", SPOOLGEN_MAX_FILE_BYTES + 1), { rowNumber: null, columnName: "weld", severity: "blocker", code: "FILE_TOO_LARGE", message: "FILE_TOO_LARGE", fileName: null })
assert.equal(checkFileSize("trace", "trace.txt", 0)?.code, "FILE_EMPTY")
// Picking files before anything is uploaded: a name already held is replaced in place, a bad size is refused with the file's name, and the import stops at SPOOLING_MAX_FILES.
const picked = (name: string, size = 10) => ({ name, size })
assert.deepEqual(addPickedFiles("pcf", [picked("A.pcf"), picked("B.pcf")], [picked("B.pcf", 20), picked("C.pcf")], 0), { files: [picked("A.pcf"), picked("B.pcf", 20), picked("C.pcf")], refused: [], overLimit: 0 })
assert.deepEqual(addPickedFiles("pcf", [], [picked("A.pcf"), picked("A.pcf", 30)], 0).files, [picked("A.pcf", 30)])
assert.deepEqual(addPickedFiles("weld", [], [picked("weld.txt", 0), picked("register.xlsx", SPOOLGEN_MAX_FILE_BYTES + 1)], 0).refused.map((issue) => [issue.code, issue.columnName, issue.fileName]), [["FILE_EMPTY", "weld", "weld.txt"], ["FILE_TOO_LARGE", "weld", "register.xlsx"]])
assert.deepEqual(addPickedFiles("pcf", [picked("A.pcf")], [picked("A.pcf", 20), picked("B.pcf"), picked("C.pcf")], SPOOLING_MAX_FILES - 2), { files: [picked("A.pcf", 20), picked("B.pcf")], refused: [], overLimit: 1 })
assert.equal(STAGING_ENTITY_KINDS.length, 6)
assert.ok(stagingOrderOf("isometric") < stagingOrderOf("spool"))
assert.ok(stagingOrderOf("spool") < stagingOrderOf("weld_joint"))
assert.ok(stagingOrderOf("flange_joint") < stagingOrderOf("material"))
assert.equal(isDecidableEntity("spool"), true)
assert.equal(isDecidableEntity("material"), false)
