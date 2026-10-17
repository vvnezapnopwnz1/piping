import assert from "node:assert/strict"
import test from "node:test"

import { legacyAddressToTarget } from "./legacy-address"

const target = (path: string, query = "") => legacyAddressToTarget(path, new URLSearchParams(query))

test("the pack comes from testPackId", () => {
  assert.equal(target("/testpack/explorer", "testPackId=abc").pack, "abc")
  assert.equal(target("/testpack").pack, null)
})

test("old pages open the step they were the screen of", () => {
  assert.equal(target("/testpack/builder").step, "composition")
  assert.equal(target("/testpack/pressure-test/line-check/progress").step, "line_check")
  assert.equal(target("/testpack/pressure-test/line-check/preparation").step, "line_check")
  assert.equal(target("/testpack/pressure-test/item-clearance").step, "item_clearance")
  assert.equal(target("/testpack/pressure-test/blinding/progress").step, "blinding")
  assert.equal(target("/testpack/pressure-test/testing-precomm").step, "testing")
  assert.equal(target("/testpack/pressure-test/reinstatement/progress").step, "y_reinstatement")
})

test("the old drawer's operation and view parameters map to steps", () => {
  assert.equal(target("/testpack/explorer", "operation=precommissioning").step, "precommissioning")
  assert.equal(target("/testpack/explorer", "operation=z_reinstatement").step, "z_reinstatement")
  assert.equal(target("/testpack/explorer", "operation=testing").step, "testing")
  assert.equal(target("/testpack/explorer", "view=definition").step, "composition")
  assert.equal(target("/testpack/explorer", "view=composition").step, "composition")
  assert.equal(target("/testpack/explorer", "view=readiness").step, "readiness")
  assert.equal(target("/testpack/explorer", "view=workflow").step, null)
})

test("an operation wins over a view, a view over the path", () => {
  assert.equal(target("/testpack/builder", "view=readiness").step, "readiness")
  assert.equal(target("/testpack/explorer", "view=readiness&operation=blinding").step, "blinding")
})

test("unknown addresses and unknown values give nothing", () => {
  assert.deepEqual(target("/somewhere/else", "operation=nope&view=nope"), { pack: null, step: null })
})
