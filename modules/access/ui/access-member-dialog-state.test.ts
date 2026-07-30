import assert from "node:assert/strict"

import { shouldCloseAccessMemberDialog } from "./access-member-dialog-state"

assert.equal(
  shouldCloseAccessMemberDialog("saved"),
  true,
  "a successful mutation closes the dialog",
)
assert.equal(
  shouldCloseAccessMemberDialog("failed"),
  false,
  "a failed mutation preserves the dialog and its entered values",
)
