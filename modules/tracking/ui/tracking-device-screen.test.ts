import assert from "node:assert/strict"
import test from "node:test"
import { summarizeDeviceUsage } from "./tracking-screen-model"

test("device summary uses only real scan usage", () => {
  const summary = summarizeDeviceUsage([
    { projectId: "p", deviceId: "d", deviceCode: "PDA-1", operatorMembershipId: "m1", locationId: "l1", locationCode: "YARD", scanCount: 5, lastUsedAt: "2026-08-02T00:00:00Z" },
    { projectId: "p", deviceId: "d", deviceCode: "PDA-1", operatorMembershipId: "m2", locationId: "l2", locationCode: "FIELD", scanCount: 2, lastUsedAt: "2026-08-03T00:00:00Z" },
  ])[0]!
  assert.equal(summary.scanCount, 7)
  assert.equal(summary.mostFrequentOperator, "m1")
  assert.equal(summary.lastUsedAt, "2026-08-03T00:00:00Z")
  assert.equal("battery" in summary, false)
})
