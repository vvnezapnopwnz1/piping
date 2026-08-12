import assert from "node:assert/strict"
import {
  validateSubcontractorInput,
  validateUnitInput,
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

// Unit validation
assert.equal(validateUnitInput({ code: " ", description: "Unit 100" }).ok, false)
assert.equal(validateUnitInput({ code: "U-100", description: "  " }).ok, false)

const validUnit = validateUnitInput({ code: " u-100 ", description: "  Unit 100  " })
assert.equal(validUnit.ok, true)
assert.deepEqual(validUnit.ok && validUnit.value, { code: "U-100", description: "Unit 100" })

// Area Classification validation
assert.equal(
  validateAreaClassificationInput({ code: "ac-1", description: "Area Class 1", unitId: "unit-1" }).ok,
  true
)

// An Area Classification with no Unit breaks the Unit → Area Classification → PDS Area chain
// the PDS Area dialog depends on, so the create form refuses it even though the column is
// nullable in the schema.
const orphanAreaClassification = validateAreaClassificationInput({
  code: "ac-1",
  description: "Area Class 1",
  unitId: null,
})
assert.equal(orphanAreaClassification.ok, false)
assert.equal(
  orphanAreaClassification.ok === false && orphanAreaClassification.errors.unitId,
  "Unit is required"
)

const validAreaClassification = validateAreaClassificationInput({
  code: " ac-1 ",
  description: "  Area Class 1 ",
  unitId: "unit-1",
})
assert.deepEqual(validAreaClassification.ok && validAreaClassification.value, {
  code: "AC-1",
  description: "Area Class 1",
  unitId: "unit-1",
})

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
