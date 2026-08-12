import assert from "node:assert/strict"

import type { Database } from "./supabase/database.types"
import {
  toProjectCreationInsert,
  toProjectDefinition,
  toProjectDefinitionUpdate,
  validateProjectCreation,
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

// --- Project creation -------------------------------------------------------
// Creation is deliberately a separate payload from the update path. The update grant covers
// logo paths because they are written back by the branding upload; a create form that could
// set them would be writing a storage path no upload ever produced.

const validCreation = {
  activityCode: " track-setup-check ",
  projectTitle: " Setup check ",
  owner: " Owner Company ",
  contractor: " EPC Contractor ",
  contractNumber: "  C-1  ",
  maxTransitTimeDays: 2,
}

const creation = validateProjectCreation(validCreation)
assert.equal(creation.isValid, true)
assert.deepEqual(creation.errors, {})
assert.equal(creation.value.activityCode, "TRACK-SETUP-CHECK")
assert.equal(creation.value.projectTitle, "Setup check")
assert.equal(creation.value.contractNumber, "C-1")

const blankContractNumber = validateProjectCreation({
  ...validCreation,
  contractNumber: "   ",
})
assert.equal(blankContractNumber.isValid, true)
assert.equal(blankContractNumber.value.contractNumber, "")

const invalidCreation = validateProjectCreation({
  ...validCreation,
  activityCode: "track setup",
  projectTitle: " ",
  owner: " ",
  contractor: " ",
  maxTransitTimeDays: 0,
})
assert.equal(invalidCreation.isValid, false)
assert.deepEqual(invalidCreation.errors, {
  activityCode: "Use uppercase letters, digits and hyphens only",
  projectTitle: "Project title is required",
  owner: "Owner is required",
  contractor: "Contractor is required",
  maxTransitTimeDays: "Maximum transit time must be at least 1 day",
})

const creatorId = "b2222222-2222-4222-8222-222222222222"
const insert = toProjectCreationInsert(validCreation, creatorId)
assert.deepEqual(insert, {
  activity_code: "TRACK-SETUP-CHECK",
  title: "Setup check",
  owner_name: "Owner Company",
  contractor_name: "EPC Contractor",
  contract_number: "C-1",
  maximum_transit_time_days: 2,
  created_by: creatorId,
})

// The insert must never carry a column the server owns. `status` in particular would let a
// creator file a project as archived, and `id` would make the new project's identity guessable.
assert.deepEqual(Object.keys(insert).sort(), [
  "activity_code",
  "contract_number",
  "contractor_name",
  "created_by",
  "maximum_transit_time_days",
  "owner_name",
  "title",
])

assert.equal(
  toProjectCreationInsert({ ...validCreation, contractNumber: "  " }, creatorId).contract_number,
  null,
)

assert.throws(
  () => toProjectCreationInsert({ ...validCreation, maxTransitTimeDays: 0 }, creatorId),
  /Maximum transit time must be at least 1 day/,
)
assert.throws(
  () => toProjectCreationInsert(validCreation, " "),
  /Creator is required/,
)
