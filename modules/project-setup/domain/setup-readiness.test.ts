import assert from "node:assert/strict"
import {
  evaluateReadinessStatus,
  getRequirementDetails,
  SETUP_REQUIREMENTS,
} from "./setup-readiness"

// Known code resolution
const sub = getRequirementDetails("subcontractors")
assert.equal(sub.label, "Subcontractors")
assert.equal(sub.tab, "general")

// Unknown code fallback
const unk = getRequirementDetails("non_existent_code")
assert.equal(unk.label, "Unknown setup requirement (non_existent_code)")
assert.equal(unk.tab, "general")

// Gate B readiness evaluation
const gateB = evaluateReadinessStatus(["subcontractors"])
assert.equal(gateB.isGateBReady, false)
assert.equal(gateB.isAdminDone, false)

const adminComplete = evaluateReadinessStatus([])
assert.equal(adminComplete.isGateBReady, true)
assert.equal(adminComplete.isAdminDone, true)

console.log("All setup-readiness.test.ts assertions passed!")
