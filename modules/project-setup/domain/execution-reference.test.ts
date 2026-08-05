import assert from "node:assert/strict"
import {
  FLANGE_JOINTING_ACTIVITY,
  validateProjectTeamInput,
  validateSubsystemInput,
  validateLocationInput,
  validatePressureUnitInput,
  validateUnitTimeReferenceInput,
  validatePunchCodeInput,
} from "./execution-reference"

// Team validation
assert.equal(
  validateProjectTeamInput({ code: "t-1", description: "Team 1", teamType: "line_check" }).ok,
  true
)

// Subsystem validation
assert.equal(
  validateSubsystemInput({ systemId: "", code: "sub-1", description: "Subsystem 1" }).ok,
  false
)

// Location validation
assert.equal(
  validateLocationInput({ categoryId: "cat-1", code: "loc-1", description: "Location 1", mappedProgressColumns: ["prefabrication"] }).ok,
  true
)

// Pressure unit validation
assert.equal(validatePressureUnitInput({ unit: "bar" }).ok, true)

// Unit time validation
assert.equal(
  validateUnitTimeReferenceInput({ activity: "flange_bolt", projectUt: 15, standardReference: "STD-1" }).ok,
  true
)
const flangeUnitTime = validateUnitTimeReferenceInput({
  activity: FLANGE_JOINTING_ACTIVITY.toLowerCase(),
  projectUt: 15,
  standardReference: " STD-FLANGE ",
})
assert.equal(flangeUnitTime.ok, true)
assert.equal(flangeUnitTime.value?.activity, FLANGE_JOINTING_ACTIVITY)
assert.equal(
  validateUnitTimeReferenceInput({ activity: FLANGE_JOINTING_ACTIVITY, projectUt: 15, standardReference: " " }).ok,
  false
)

const punchCode = validatePunchCodeInput({ code: " p-001 ", description: "  Missing support  " })
assert.equal(punchCode.ok, true)
assert.equal(punchCode.value?.code, "P-001")
assert.equal(punchCode.value?.description, "Missing support")
assert.equal(validatePunchCodeInput({ code: " ", description: "Missing support" }).ok, false)
assert.equal(validatePunchCodeInput({ code: "P-001", description: " " }).ok, false)

console.log("All execution-reference.test.ts assertions passed!")
