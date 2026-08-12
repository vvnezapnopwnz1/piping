import assert from "node:assert/strict"
import test from "node:test"
import { isometricOptions, keepSelectedOption, subsystemOptionsForSystem, toReferenceOptions } from "./test-pack-reference-model"

const systems = [
  { id: "sys-process", code: "SYS-PROCESS", description: "Process piping system" },
  { id: "sys-utilities", code: "SYS-UTILITIES", description: "Plant utilities piping system" },
]
const subsystems = [
  { id: "sub-feed", code: "SUB-FEED", description: "Process feed subsystem", systemId: "sys-process" },
  { id: "sub-product", code: "SUB-PRODUCT", description: "Process product subsystem", systemId: "sys-process" },
  { id: "sub-air", code: "SUB-AIR", description: "Plant air subsystem", systemId: "sys-utilities" },
]

test("reference options show the business code and description, never the raw id", () => {
  assert.deepEqual(toReferenceOptions(systems), [
    { id: "sys-process", label: "SYS-PROCESS · Process piping system" },
    { id: "sys-utilities", label: "SYS-UTILITIES · Plant utilities piping system" },
  ])
  assert.deepEqual(toReferenceOptions([{ id: "sc-1", code: "SC-CS150", description: null }]), [
    { id: "sc-1", label: "SC-CS150" },
  ])
})

test("subsystem options depend on the selected system and are empty until one is chosen", () => {
  assert.deepEqual(subsystemOptionsForSystem(subsystems, "sys-process").map((option) => option.label), [
    "SUB-FEED · Process feed subsystem",
    "SUB-PRODUCT · Process product subsystem",
  ])
  assert.deepEqual(subsystemOptionsForSystem(subsystems, "sys-utilities").map((option) => option.id), ["sub-air"])
  assert.deepEqual(subsystemOptionsForSystem(subsystems, ""), [])
})

test("a selection that is not offered by the current options is cleared instead of submitted", () => {
  const options = subsystemOptionsForSystem(subsystems, "sys-process")
  assert.equal(keepSelectedOption("sub-feed", options), "sub-feed")
  assert.equal(keepSelectedOption("sub-air", options), "")
  assert.equal(keepSelectedOption("", options), "")
})

test("ISO options label the readiness row with its business ISO number and keep the id as the value", () => {
  const readiness = [
    { isometric_id: "iso-2001", is_rft: false },
    { isometric_id: "iso-1001", is_rft: true },
    { isometric_id: null, is_rft: null },
  ]
  const numbers = [
    { id: "iso-1001", isoNumber: "ISO-DEMO-1001" },
    { id: "iso-2001", isoNumber: "ISO-DEMO-2001" },
  ]
  assert.deepEqual(isometricOptions(readiness, numbers), [
    { id: "iso-1001", label: "ISO-DEMO-1001", isRft: true },
    { id: "iso-2001", label: "ISO-DEMO-2001", isRft: false },
  ])
})

test("an ISO without a readable number keeps a stable option instead of dropping out of the list", () => {
  assert.deepEqual(isometricOptions([{ isometric_id: "iso-9", is_rft: null }], []), [
    { id: "iso-9", label: "iso-9", isRft: false },
  ])
})
