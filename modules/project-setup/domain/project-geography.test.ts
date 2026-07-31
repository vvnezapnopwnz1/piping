import assert from "node:assert/strict"
import {
  validateSubcontractorInput,
  validateAreaClassificationInput,
  validatePdsAreaInput,
} from "./project-geography"

// Subcontractor validation
assert.equal(
  validateSubcontractorInput({ code: " ", description: "Sub A", contactDetails: null }).ok,
  false
)
assert.equal(
  validateSubcontractorInput({ code: "sub-a", description: "Sub A", contactDetails: " email@test.com " }).ok,
  true
)

// Area Classification validation
assert.equal(
  validateAreaClassificationInput({ code: "ac-1", description: "Area Class 1", unitId: "unit-1" }).ok,
  true
)

// PDS Area validation requires at least one subcontractor
assert.equal(
  validatePdsAreaInput({
    code: "pds-1",
    description: "PDS 1",
    shopSubcontractorId: null,
    assemblySubcontractorId: null,
    fieldSubcontractorId: null,
    areaClassificationId: null,
    environment: "above_ground",
    isUnit: true,
    isRack: false,
    customValues: { custom_a: "val" },
  }).ok,
  false
)

assert.equal(
  validatePdsAreaInput(
    {
      code: "pds-1",
      description: "PDS 1",
      shopSubcontractorId: "sub-1",
      assemblySubcontractorId: null,
      fieldSubcontractorId: null,
      areaClassificationId: null,
      environment: "above_ground",
      isUnit: true,
      isRack: false,
      customValues: { custom_a: "val", unallowed: "bad" },
    },
    ["custom_a"]
  ).ok,
  true
)

// Sanitization of unallowed custom value keys
const validPds = validatePdsAreaInput(
  {
    code: "pds-1",
    description: "PDS 1",
    shopSubcontractorId: "sub-1",
    assemblySubcontractorId: null,
    fieldSubcontractorId: null,
    areaClassificationId: null,
    environment: "above_ground",
    isUnit: true,
    isRack: false,
    customValues: { custom_a: "val", unallowed: "bad" },
  },
  ["custom_a"]
)

assert.deepEqual(validPds.ok && validPds.value.customValues, { custom_a: "val" })

console.log("All project-geography.test.ts assertions passed!")
