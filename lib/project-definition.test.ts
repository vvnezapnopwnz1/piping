import assert from "node:assert/strict"

import type { Database } from "./supabase/database.types"
import {
  toProjectDefinition,
  toProjectDefinitionUpdate,
  validateProjectDefinition,
} from "./project-definition"

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"]

const projectRow: ProjectRow = {
  id: "a1111111-1111-4111-8111-111111111111",
  activity_code: "PQ-001",
  title: "PipeQC Project",
  owner_name: "Owner Company",
  contractor_name: "EPC Contractor",
  owner_logo_path: null,
  contractor_logo_path: "https://example.com/contractor.svg",
  maximum_transit_time_days: 14,
  contract_number: null,
  status: "active",
  created_by: "b2222222-2222-4222-8222-222222222222",
  created_at: "2026-07-29T10:00:00.000Z",
  updated_at: "2026-07-29T11:00:00.000Z",
}

const validInput = {
  activityCode: " pq-001 ",
  projectTitle: " PipeQC Project ",
  owner: " Owner Company ",
  contractor: " EPC Contractor ",
  ownerLogoUrl: " ",
  contractorLogoUrl: " https://example.com/contractor.svg ",
  maxTransitTimeDays: 14,
}

assert.deepEqual(toProjectDefinition(projectRow), {
  activityCode: "PQ-001",
  projectTitle: "PipeQC Project",
  owner: "Owner Company",
  contractor: "EPC Contractor",
  ownerLogoUrl: "",
  contractorLogoUrl: "https://example.com/contractor.svg",
  maxTransitTimeDays: 14,
  updatedAt: "2026-07-29T11:00:00.000Z",
})

const normalized = validateProjectDefinition(validInput)
assert.equal(normalized.isValid, true)
assert.deepEqual(normalized.errors, {})
assert.equal(normalized.value.activityCode, "PQ-001")
assert.equal(normalized.value.ownerLogoUrl, "")

const invalid = validateProjectDefinition({
  ...validInput,
  activityCode: "PQ 001",
  projectTitle: " ",
  owner: " ",
  contractor: " ",
  maxTransitTimeDays: 0,
})
assert.equal(invalid.isValid, false)
assert.deepEqual(invalid.errors, {
  activityCode: "Use uppercase letters, digits and hyphens only",
  projectTitle: "Project title is required",
  owner: "Owner is required",
  contractor: "Contractor is required",
  maxTransitTimeDays: "Maximum transit time must be at least 1 day",
})

const fractionalTransitTime = validateProjectDefinition({
  ...validInput,
  maxTransitTimeDays: 1.5,
})
assert.equal(fractionalTransitTime.isValid, false)
assert.equal(
  fractionalTransitTime.errors.maxTransitTimeDays,
  "Maximum transit time must be a whole number of days",
)

const update = toProjectDefinitionUpdate(validInput)
assert.deepEqual(update, {
  activity_code: "PQ-001",
  title: "PipeQC Project",
  owner_name: "Owner Company",
  contractor_name: "EPC Contractor",
  owner_logo_path: null,
  contractor_logo_path: "https://example.com/contractor.svg",
  maximum_transit_time_days: 14,
})
assert.deepEqual(Object.keys(update).sort(), [
  "activity_code",
  "contractor_logo_path",
  "contractor_name",
  "maximum_transit_time_days",
  "owner_logo_path",
  "owner_name",
  "title",
])
assert.throws(
  () => toProjectDefinitionUpdate({ ...validInput, maxTransitTimeDays: 0 }),
  /Maximum transit time must be at least 1 day/,
)
