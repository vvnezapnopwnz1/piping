import assert from "node:assert/strict"
import {
  normalizeReferenceCode,
  validateReferenceIdentity,
  getReferenceStatusActions,
} from "./reference"

assert.equal(normalizeReferenceCode("  pds-a  "), "PDS-A")
assert.deepEqual(
  validateReferenceIdentity({ code: " ", description: "Area" }),
  { ok: false, errors: { code: "Code is required" } }
)
assert.deepEqual(getReferenceStatusActions("active"), [
  "deactivate",
  "archive",
])
assert.deepEqual(getReferenceStatusActions("archived"), ["reactivate"])

console.log("All reference.test.ts assertions passed!")
