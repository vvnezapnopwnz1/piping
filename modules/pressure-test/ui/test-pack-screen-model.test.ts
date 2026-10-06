import assert from "node:assert/strict"
import test from "node:test"
import {
  canMutateTestPack,
  eligibleMemberRemoval,
  filterTestPackCatalog,
  TEST_PACK_VIEWS,
} from "./test-pack-screen-model"

test("Builder filtering is scoped to visible server catalog rows", () => {
  const rows = [
    { id: "1", projectId: "p", testPackNumber: "TP-001", revisionNo: 0, lifecycle: "active", activeIsoCount: 1 },
    { id: "2", projectId: "p", testPackNumber: "TP-002", revisionNo: 1, lifecycle: "archived", activeIsoCount: 2 },
  ]
  assert.deepEqual(filterTestPackCatalog(rows, "002").map((row) => row.id), ["2"])
  assert.deepEqual(filterTestPackCatalog(rows, ""), rows)
  assert.equal(canMutateTestPack(true, "active"), true)
  assert.equal(canMutateTestPack(true, "archived"), false)
  assert.equal(canMutateTestPack(false, "active"), false)
})

test("Target views cover definition, composition, readiness and workflow, and removal stays server-eligible", () => {
  assert.deepEqual(TEST_PACK_VIEWS, ["definition", "composition", "readiness", "workflow"])
  assert.equal(eligibleMemberRemoval({ removed_at: null }), true)
  assert.equal(eligibleMemberRemoval({ removed_at: "2026-08-05T00:00:00Z" }), false)
})
