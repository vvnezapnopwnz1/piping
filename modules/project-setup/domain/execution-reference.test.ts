import assert from "node:assert/strict"
import {
  validateProjectTeamInput,
  validateSubsystemInput,
  validateLocationInput,
  validatePressureUnitInput,
  validateUnitTimeReferenceInput,
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

console.log("All execution-reference.test.ts assertions passed!")
