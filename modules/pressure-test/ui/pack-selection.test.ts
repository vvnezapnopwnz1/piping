import assert from "node:assert/strict"
import test from "node:test"

import { resolvePackSelection, shouldReloadForRequested } from "./pack-selection"

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

test("a pack missing from a loaded list triggers one reload per requested id (it may have just been created)", () => {
  assert.equal(shouldReloadForRequested({ kind: "not_found" }, true, "new-pack", null), true)
  assert.equal(shouldReloadForRequested({ kind: "not_found" }, true, "new-pack", "new-pack"), false)
  assert.equal(shouldReloadForRequested({ kind: "not_found" }, false, "new-pack", null), false)
  assert.equal(shouldReloadForRequested({ kind: "selected", id: "a" }, true, "a", null), false)
})
