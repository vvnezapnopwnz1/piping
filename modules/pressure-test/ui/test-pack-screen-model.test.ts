import assert from "node:assert/strict"
import test from "node:test"
import { canMutateTestPack, eligibleMemberRemoval, explorerTabs, filterTestPackCatalog } from "./test-pack-screen-model"

test("Builder filtering is scoped to visible server catalog rows", () => {
  const rows = [{ id: "1", projectId: "p", testPackNumber: "TP-001", revisionNo: 0, lifecycle: "active", activeIsoCount: 1 }, { id: "2", projectId: "p", testPackNumber: "TP-002", revisionNo: 1, lifecycle: "archived", activeIsoCount: 2 }]
  assert.deepEqual(filterTestPackCatalog(rows, "002").map((row) => row.id), ["2"])
  assert.deepEqual(filterTestPackCatalog(rows, ""), rows)
  assert.equal(canMutateTestPack(true, "active"), true)
  assert.equal(canMutateTestPack(true, "archived"), false)
  assert.equal(canMutateTestPack(false, "active"), false)
})

test("Explorer exposes the seven manual tabs and removal stays server-eligible", () => {
  assert.equal(explorerTabs.length, 7)
  assert.equal(explorerTabs[0], "General")
  assert.equal(eligibleMemberRemoval({ removed_at: null }), true)
  assert.equal(eligibleMemberRemoval({ removed_at: "2026-08-05T00:00:00Z" }), false)
})
