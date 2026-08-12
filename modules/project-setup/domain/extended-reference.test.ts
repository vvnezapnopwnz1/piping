import assert from "node:assert/strict"
import {
  validateDeviceInput,
  validateSpoolingMaterialClassInput,
  validatePaintMatrixInput,
  validateAssemblySettingsInput,
  validateDeviceUserInput,
} from "./extended-reference"

// Device validation
assert.equal(validateDeviceInput({ code: "dev-1", description: "Device 1" }).ok, true)
assert.equal(validateDeviceUserInput({ membershipId: "member-1", deviceId: "device-1" }).ok, true)
assert.equal(validateDeviceUserInput({ membershipId: "", deviceId: "device-1" }).ok, false)

// Spooling class validation
assert.equal(
  validateSpoolingMaterialClassInput({ externalClassCode: "a106", materialTypeId: "mat-1" }).ok,
  true
)

// Paint matrix validation
assert.equal(
  validatePaintMatrixInput({
    lineServiceId: "line-1",
    ralCodeId: "ral-1",
    blastingRequired: true,
    primerRequired: true,
    intermediateCoatCount: 1,
    finalCoatCount: 1,
    requiredFinalDftMicrons: 250,
  }).ok,
  true
)

// Assembly settings validation
assert.equal(
  validateAssemblySettingsInput({ enabled: true, defaultSubcontractorId: null }).ok,
  false
)
assert.equal(
  validateAssemblySettingsInput({ enabled: true, defaultSubcontractorId: "sub-1" }).ok,
  true
)

console.log("All extended-reference.test.ts assertions passed!")
