import assert from "node:assert/strict"
import {
  validateServiceClassInput,
  validateWeldTypeInput,
  validateWelderQualificationInput,
  validateNdeMatrixRuleInput,
  validateThicknessFlangeRuleInput,
  validatePipingMaterialRecordInput,
  validateReworkCodeInput,
  validateJointCategoryInput,
  isWelderCurrentlyQualified,
  evaluateNdeMatrixCoverage,
} from "./welding-quality-reference"

// Service Class validation
assert.equal(
  validateServiceClassInput({ code: " ", description: null, materialTypeId: "mat-1" }).ok,
  false
)
assert.equal(
  validateServiceClassInput({ code: "sc-1", description: "Service Class 1", materialTypeId: "" }).ok,
  false
)
assert.equal(
  validateServiceClassInput({ code: "sc-1", description: "Service Class 1", materialTypeId: "mat-1" }).ok,
  true
)

// Weld Type validation
assert.equal(
  validateWeldTypeInput({ code: "wt-1", description: "Weld Type 1", countsInDiaInch: true }).ok,
  true
)

// Welder Qualification validation
assert.equal(
  validateWelderQualificationInput({
    welderCode: "w-1",
    fullName: "John Welder",
    subcontractorId: "sub-1",
    certificateNumber: "CERT123",
    expiresOn: "2026-12-31",
    wpsIds: [],
  }).ok,
  false
)

const validWelder = validateWelderQualificationInput({
  welderCode: "w-1",
  fullName: "John Welder",
  subcontractorId: "sub-1",
  certificateNumber: "CERT123",
  expiresOn: "2026-12-31",
  wpsIds: ["wps-1", "wps-1", "wps-2"],
})

assert.equal(validWelder.ok, true)
assert.deepEqual(validWelder.ok && validWelder.value.wpsIds, ["wps-1", "wps-2"])

// Qualification expiry check
assert.equal(isWelderCurrentlyQualified("2020-01-01"), false)
assert.equal(isWelderCurrentlyQualified("2030-01-01"), true)

// NDE Matrix Rule validation
assert.equal(
  validateNdeMatrixRuleInput({
    serviceClassId: "sc-1",
    weldTypeId: "wt-1",
    weldLocation: "shop",
    rtCoverage: 110,
    utCoverage: 0,
    mtCoverage: 0,
    ptCoverage: 0,
    pmiCoverage: 0,
    htCoverage: 0,
    pwhtRequired: false,
    pwhtThicknessThreshold: null,
    materialTraceabilityRequired: true,
  }).ok,
  false
)

assert.equal(
  validateNdeMatrixRuleInput({
    serviceClassId: "sc-1",
    weldTypeId: "wt-1",
    weldLocation: "shop",
    rtCoverage: 100,
    utCoverage: 10,
    mtCoverage: 0,
    ptCoverage: 0,
    pmiCoverage: 0,
    htCoverage: 0,
    pwhtRequired: true,
    pwhtThicknessThreshold: 19.05,
    materialTraceabilityRequired: true,
  }).ok,
  true
)

// NDE Matrix Coverage projection
const coverage = evaluateNdeMatrixCoverage(
  ["sc-1"],
  ["wt-1"],
  false, // assembly disabled -> requires shop & field
  [{ serviceClassId: "sc-1", weldTypeId: "wt-1", weldLocation: "shop" }]
)
assert.equal(coverage.missingTuples.length, 1)
assert.equal(coverage.missingTuples[0].weldLocation, "field")

// Thickness / Flange Rule validation
assert.equal(
  validateThicknessFlangeRuleInput({
    serviceClassId: "sc-1",
    diameterInch: 0,
    thicknessMm: 5,
    flangeRating: "150#",
  }).ok,
  false
)
assert.equal(
  validateThicknessFlangeRuleInput({
    serviceClassId: "sc-1",
    diameterInch: 2,
    thicknessMm: 5.5,
    flangeRating: "150#",
  }).ok,
  true
)

// Piping Material Record validation
assert.equal(
  validatePipingMaterialRecordInput({ mrrNumber: "", identCode: "PIPE-01", traceNumber: "HEAT-1" }).ok,
  false
)
assert.equal(
  validatePipingMaterialRecordInput({ mrrNumber: "MRR-01", identCode: "pipe-01", traceNumber: "HEAT-1" }).ok,
  true
)

// Rework Code validation
assert.equal(validateReworkCodeInput({ code: "rw-1", description: "Rework 1" }).ok, true)

// Joint Category validation
assert.equal(
  validateJointCategoryInput({
    jointDefinition: "Flange joint",
    timing: "before_pressure_test",
    categoryCode: "CAT-A",
    reason: "Critical fluid",
    coefficient: 1.5,
  }).ok,
  true
)

console.log("All welding-quality-reference.test.ts assertions passed!")
