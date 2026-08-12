import assert from "node:assert/strict"
import { SPOOLGEN_FILE_ROLES, SPOOLGEN_MAX_FILE_BYTES, checkFileSize, describeFileSet, isSpoolgenFileRole, missingRequiredRoles } from "./spoolgen-file"
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
assert.equal(checkFileSize("weld", "weld.txt", SPOOLGEN_MAX_FILE_BYTES + 1)?.code, "FILE_TOO_LARGE")
assert.equal(checkFileSize("trace", "trace.txt", 0)?.code, "FILE_EMPTY")
assert.equal(STAGING_ENTITY_KINDS.length, 6)
assert.ok(stagingOrderOf("isometric") < stagingOrderOf("spool"))
assert.ok(stagingOrderOf("spool") < stagingOrderOf("weld_joint"))
assert.ok(stagingOrderOf("flange_joint") < stagingOrderOf("material"))
assert.equal(isDecidableEntity("spool"), true)
assert.equal(isDecidableEntity("material"), false)
