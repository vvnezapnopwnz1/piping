import assert from "node:assert/strict"
import test from "node:test"
import {
  normalizeItemClearanceAssignment,
  normalizeLineCheckAssignment,
  normalizePunchItemInput,
} from "./punch-item"

test("normalizes a Category X punch without allowing browser-owned identity", () => {
  const result = normalizePunchItemInput({
    testPackId: " pack-1 ",
    isometricId: " iso-1 ",
    spoolId: " spool-1 ",
    punchCodeId: " code-1 ",
    description: "  Missing support  ",
    checkingDate: "2026-08-10",
    completionDate: "2026-08-12",
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.testPackId, "pack-1")
  assert.equal(result.value.description, "Missing support")
  assert.equal("itemNumber" in result.value, false)
  assert.equal("clearedAt" in result.value, false)
})
test("requires dates, current targets and an editable description", () => {
  const result = normalizePunchItemInput({
    testPackId: " ",
    isometricId: " ",
    punchCodeId: " ",
    description: " ",
    checkingDate: "10-08-2026",
    completionDate: "2026-08-09",
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.errors.testPackId, "testPackId is required")
  assert.equal(result.errors.checkingDate, "Checking date must be an ISO date")
})

test("assignment requires unique ISO or punch targets and an active team supplied by the server", () => {
  const line = normalizeLineCheckAssignment({
    testPackId: "pack-1",
    isometricIds: ["iso-1", "iso-1"],
    teamId: "team-1",
    assignedDate: "2026-08-10",
  })
  assert.equal(line.ok, false)

  const clearance = normalizeItemClearanceAssignment({
    testPackId: "pack-1",
    punchItemIds: ["punch-1"],
    teamId: "team-1",
    assignedDate: "2026-08-10",
  })
  assert.equal(clearance.ok, true)
})
