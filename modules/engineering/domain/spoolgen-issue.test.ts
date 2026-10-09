import assert from "node:assert/strict"
import { SPOOLGEN_ISSUE_CODES, isSpoolgenIssueCode, spoolgenIssue } from "./spoolgen-issue"

assert.deepEqual([...SPOOLGEN_ISSUE_CODES], ["EMPTY_FILE", "MISSING_COLUMN", "MISSING_VALUE", "INVALID_NUMBER", "ORPHAN_SPOOL", "ISO_MIXED_SERVICE_CLASS", "ISO_MIXED_LINE", "ISO_MIXED_REVISION", "FILE_EMPTY", "FILE_TOO_LARGE", "MISSING_REQUIRED_FILE"])
assert.equal(isSpoolgenIssueCode("ORPHAN_SPOOL"), true)
assert.equal(isSpoolgenIssueCode("SRV_WPS_MISSING"), false)
// The stored text is the code: the sentence is chosen on screen, in the user's language.
assert.deepEqual(spoolgenIssue("MISSING_VALUE", 3, "weld_number"), { rowNumber: 3, columnName: "weld_number", severity: "blocker", code: "MISSING_VALUE", message: "MISSING_VALUE" })
