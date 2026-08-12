import assert from "node:assert/strict"
import { SPOOLGEN_ROLE_LABELS, UPLOAD_BUTTON_LABELS } from "./spooling-import-screen"

assert.match(SPOOLGEN_ROLE_LABELS.weld, /ISO \/ spool \/ weld structure/)
assert.match(SPOOLGEN_ROLE_LABELS.trace, /material trace/)
assert.match(SPOOLGEN_ROLE_LABELS.bolt, /flange and bolting/)
assert.match(SPOOLGEN_ROLE_LABELS.supp, /supports/)
assert.equal(UPLOAD_BUTTON_LABELS.weld, "Upload weld.txt")
assert.equal(UPLOAD_BUTTON_LABELS.supp, "Upload supp.txt")
