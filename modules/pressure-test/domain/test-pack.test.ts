import assert from "node:assert/strict"
import test from "node:test"
import { normalizeTestPackInput, type CreateTestPackInput } from "./test-pack"

const validInput: CreateTestPackInput = {
  testPackNumber: " TP-001 ",
  location: "  Unit 1  ",
  priority: "  high ",
  medium: "p",
  pressure: 12.5,
  volumeM3: 10,
  plannedStartOn: "2026-08-10",
  plannedEndOn: "2026-08-12",
  systemId: "system-1",
  subsystemId: "subsystem-1",
  serviceClassId: "service-class-1",
  lineServiceId: "line-service-1",
  isoIds: [" iso-2 ", "iso-1"],
}

test("normalizes metadata and preserves ISO selection order", () => {
  const result = normalizeTestPackInput(validInput)
  assert.equal(result.ok, true)
  if (!result.ok) return

  assert.deepEqual(result.value, {
    ...validInput,
    testPackNumber: "TP-001",
    location: "Unit 1",
    priority: "high",
    medium: "P",
    isoIds: ["iso-2", "iso-1"],
  })
})
test("rejects invalid metadata and duplicate or blank ISO ids", () => {
  const result = normalizeTestPackInput({
    ...validInput,
    testPackNumber: " ",
    location: " ",
    priority: " ",
    medium: "x",
    pressure: 0,
    volumeM3: Number.NaN,
    plannedStartOn: "10-08-2026",
    plannedEndOn: "2026-08-09",
    systemId: "",
    subsystemId: " ",
    serviceClassId: "",
    lineServiceId: "",
    isoIds: ["iso-1", " ISO-1 ", " "],
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.errors.testPackNumber, "Test Pack number is required")
  assert.equal(result.errors.medium, "Test medium must be H, P, or V")
  assert.equal(result.errors.isoIds, "ISO ids must be non-empty and unique")
})

test("allows omitted volume and requires ISO dates with an ordered range", () => {
  const result = normalizeTestPackInput({
    ...validInput,
    volumeM3: undefined,
    plannedStartOn: "2026-08-12",
    plannedEndOn: "2026-08-11",
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.errors.plannedEndOn, "Planned end cannot be before planned start")
})

test("mutation input does not accept readiness or workflow state", () => {
  assert.equal("readiness" in validInput, false)
  assert.equal("lifecycle" in validInput, false)
  assert.equal("revisionNo" in validInput, false)
})
