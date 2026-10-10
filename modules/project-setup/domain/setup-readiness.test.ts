import assert from "node:assert/strict"
import { evaluateReadinessStatus } from "./setup-readiness"

// Gate B readiness evaluation
const gateB = evaluateReadinessStatus(["subcontractors"])
assert.equal(gateB.isGateBReady, false)
assert.equal(gateB.isAdminDone, false)

const adminComplete = evaluateReadinessStatus([])
assert.equal(adminComplete.isGateBReady, true)
assert.equal(adminComplete.isAdminDone, true)

console.log("All setup-readiness.test.ts assertions passed!")

