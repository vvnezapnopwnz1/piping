import assert from "node:assert/strict"
import test from "node:test"

import { resolvePackSelection } from "./pack-selection"

const packs = [{ id: "a" }, { id: "b" }]

test("a requested pack that exists is selected", () => {
  assert.deepEqual(resolvePackSelection(packs, "b"), { kind: "selected", id: "b" })
})
test("a requested pack that does not exist is reported, not replaced by another", () => {
  assert.deepEqual(resolvePackSelection(packs, "zzz"), { kind: "not_found" })
})
test("nothing requested selects nothing; the caller shows the list", () => {
  assert.deepEqual(resolvePackSelection(packs, null), { kind: "none" })
  assert.deepEqual(resolvePackSelection([], null), { kind: "none" })
})
