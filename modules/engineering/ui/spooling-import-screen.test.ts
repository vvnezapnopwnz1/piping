import assert from "node:assert/strict"

import { en } from "@/i18n/messages"

const roles = en.codes.spoolgenRole
const uploads = en.codes.spoolgenUpload

assert.match(roles.weld, /ISO \/ spool \/ weld structure/)
assert.match(roles.trace, /material trace/)
assert.match(roles.bolt, /flange and bolting/)
assert.match(roles.supp, /supports/)
assert.equal(uploads.weld, "Upload weld.txt")
assert.equal(uploads.supp, "Upload supp.txt")
