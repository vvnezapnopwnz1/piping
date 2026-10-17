import assert from "node:assert/strict"
import test from "node:test"

import { nextTestingAction, reinstatementDraftErrors, reinstatementTargets } from "./testing-actions"

test("the server's allowed operation picks the testing button", () => {
  assert.equal(nextTestingAction(["testing_complete"]), "testing_complete")
  assert.equal(nextTestingAction(["testing_start"]), "testing_start")
  assert.equal(nextTestingAction(["precommissioning"]), "precommissioning")
  assert.equal(nextTestingAction([]), null)
})

test("a step only takes the operations it owns", () => {
  assert.equal(nextTestingAction(["precommissioning"], ["testing_start", "testing_complete"]), null)
  assert.equal(nextTestingAction(["testing_start", "precommissioning"], ["precommissioning"]), "precommissioning")
})

test("reinstatement targets are the category the server allows now", () => {
  const targets = [
    { category_code: "Y", flange_joint_revision_id: "f1", flange_number: "F1" },
    { category_code: "Z", flange_joint_revision_id: "f2", flange_number: "F2" },
  ]
  assert.deepEqual(reinstatementTargets(targets, ["y_reinstatement"], "Y").map((target) => target.id), ["f1"])
  assert.deepEqual(reinstatementTargets(targets, ["y_reinstatement"], "Z"), [])
  assert.deepEqual(reinstatementTargets(targets, ["z_reinstatement"], "Z").map((target) => target.id), ["f2"])
})

test("a reinstatement record needs a report number and a tag number, reported by field", () => {
  assert.deepEqual(reinstatementDraftErrors({ report: "", tag: "" }), { report: true, tag: true })
  assert.deepEqual(reinstatementDraftErrors({ report: "R1", tag: " " }), { tag: true })
  assert.deepEqual(reinstatementDraftErrors({ report: "R1", tag: "T1" }), {})
})
