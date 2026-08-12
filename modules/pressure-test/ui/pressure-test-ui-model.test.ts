import assert from "node:assert/strict"
import test from "node:test"
import { getPressureTestRequestConfig, pressureTestRequestTypes, summarizeWorkflow } from "./pressure-test-ui-model"

test("all assignable request types have a server-backed preparation contract", () => {
  assert.deepEqual(pressureTestRequestTypes, ["line_check", "item_clearance", "blinding", "reinstatement"])
  for (const type of pressureTestRequestTypes) {
    const config = getPressureTestRequestConfig(type)
    assert.ok(config.title)
    assert.ok(config.teamType)
    assert.ok(config.printPath.includes("requestId"))
    assert.ok(config.worklist)
  }
})

test("workflow summary exposes server state without inventing numeric codes", () => {
  assert.deepEqual(summarizeWorkflow({ isRft: false, blindingAssigned: false, blindingCompleted: false, testingStarted: false, testingCompleted: false, yEligible: true, yReinstated: false, precommissioned: false, zEligible: true, zReinstated: false }), { label: "Awaiting RFT", tone: "blocked" })
  assert.deepEqual(summarizeWorkflow({ isRft: true, blindingAssigned: true, blindingCompleted: true, testingStarted: false, testingCompleted: false, yEligible: false, yReinstated: false, precommissioned: false, zEligible: false, zReinstated: false }), { label: "Ready to start testing", tone: "ready", code: 12 })
})
