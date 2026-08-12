import type { Database } from "./supabase/database.types"

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"]
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"]

export type ProjectDefinitionRow = Pick<
  ProjectRow,
  | "activity_code"
  | "title"
  | "owner_name"
  | "contractor_name"
  | "owner_logo_path"
  | "contractor_logo_path"
  | "maximum_transit_time_days"
  | "updated_at"
>

type MutableProjectDefinitionColumn =
  | "activity_code"
  | "title"
  | "owner_name"
  | "contractor_name"
  | "owner_logo_path"
  | "contractor_logo_path"
  | "maximum_transit_time_days"

export type ProjectDefinitionUpdate = Required<
  Pick<ProjectUpdate, MutableProjectDefinitionColumn>
>

export interface ProjectDefinitionInput {
  activityCode: string
  projectTitle: string
  owner: string
  contractor: string
  ownerLogoUrl: string
  contractorLogoUrl: string
  maxTransitTimeDays: number
}

export interface ProjectDefinition extends ProjectDefinitionInput {
  updatedAt: string
}

/**
 * Creation is not the update payload minus a few fields. Logo paths are produced by the branding
 * upload and written back by it, `status` and the timestamps belong to the server, and `id` must
 * stay unguessable — so the create form owns its own, smaller input.
 */
export interface ProjectCreationInput {
  activityCode: string
  projectTitle: string
  owner: string
  contractor: string
  contractNumber: string
  maxTransitTimeDays: number
}

type CreatableProjectColumn =
  | "activity_code"
  | "title"
  | "owner_name"
  | "contractor_name"
  | "contract_number"
  | "maximum_transit_time_days"
  | "created_by"

export type ProjectCreationInsert = Required<
  Pick<Database["public"]["Tables"]["projects"]["Insert"], CreatableProjectColumn>
>

export type ProjectCreationField = keyof ProjectCreationInput

export interface ProjectCreationValidation {
  isValid: boolean
  errors: Partial<Record<ProjectCreationField, string>>
  value: ProjectCreationInput
}

export type ProjectDefinitionField = keyof ProjectDefinitionInput

export interface ProjectDefinitionValidation {
  isValid: boolean
  errors: Partial<Record<ProjectDefinitionField, string>>
  value: ProjectDefinitionInput
}

const ACTIVITY_CODE_RE = /^[A-Z0-9-]+$/

function normalize(input: ProjectDefinitionInput): ProjectDefinitionInput {
  return {
    activityCode: input.activityCode.trim().toUpperCase(),
    projectTitle: input.projectTitle.trim(),
    owner: input.owner.trim(),
    contractor: input.contractor.trim(),
    ownerLogoUrl: input.ownerLogoUrl.trim(),
    contractorLogoUrl: input.contractorLogoUrl.trim(),
    maxTransitTimeDays: input.maxTransitTimeDays,
  }
}

export function toProjectDefinition(
  row: ProjectDefinitionRow,
): ProjectDefinition {
  return {
    activityCode: row.activity_code,
    projectTitle: row.title,
    owner: row.owner_name,
    contractor: row.contractor_name,
    ownerLogoUrl: row.owner_logo_path ?? "",
    contractorLogoUrl: row.contractor_logo_path ?? "",
    maxTransitTimeDays: row.maximum_transit_time_days,
    updatedAt: row.updated_at,
  }
}

export function validateProjectDefinition(
  input: ProjectDefinitionInput,
): ProjectDefinitionValidation {
  const value = normalize(input)
  const errors: ProjectDefinitionValidation["errors"] = {}

  if (!value.activityCode) {
    errors.activityCode = "Activity code is required"
  } else if (!ACTIVITY_CODE_RE.test(value.activityCode)) {
    errors.activityCode = "Use uppercase letters, digits and hyphens only"
  }

  if (!value.projectTitle) {
    errors.projectTitle = "Project title is required"
  }
  if (!value.owner) {
    errors.owner = "Owner is required"
  }
  if (!value.contractor) {
    errors.contractor = "Contractor is required"
  }
  if (
    !Number.isFinite(value.maxTransitTimeDays) ||
    value.maxTransitTimeDays < 1
  ) {
    errors.maxTransitTimeDays = "Maximum transit time must be at least 1 day"
  } else if (!Number.isInteger(value.maxTransitTimeDays)) {
    errors.maxTransitTimeDays =
      "Maximum transit time must be a whole number of days"
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    value,
  }
}

/**
 * Every identity rule is shared with the edit form, so creation borrows it rather than growing a
 * second copy that can drift. Only the contract number is creation-specific, and it is optional.
 */
export function validateProjectCreation(
  input: ProjectCreationInput,
): ProjectCreationValidation {
  const shared = validateProjectDefinition({
    activityCode: input.activityCode,
    projectTitle: input.projectTitle,
    owner: input.owner,
    contractor: input.contractor,
    ownerLogoUrl: "",
    contractorLogoUrl: "",
    maxTransitTimeDays: input.maxTransitTimeDays,
  })

  return {
    isValid: shared.isValid,
    errors: shared.errors,
    value: {
      activityCode: shared.value.activityCode,
      projectTitle: shared.value.projectTitle,
      owner: shared.value.owner,
      contractor: shared.value.contractor,
      contractNumber: input.contractNumber.trim(),
      maxTransitTimeDays: shared.value.maxTransitTimeDays,
    },
  }
}

export function toProjectCreationInsert(
  input: ProjectCreationInput,
  creatorId: string,
): ProjectCreationInsert {
  const validation = validateProjectCreation(input)
  const firstError = Object.values(validation.errors)[0]

  if (firstError) {
    throw new Error(firstError)
  }
  // The policy compares created_by to auth.uid(), so an empty creator would be refused by the
  // database anyway — failing here keeps the reason readable.
  if (!creatorId.trim()) {
    throw new Error("Creator is required")
  }

  const value = validation.value
  return {
    activity_code: value.activityCode,
    title: value.projectTitle,
    owner_name: value.owner,
    contractor_name: value.contractor,
    contract_number: value.contractNumber || null,
    maximum_transit_time_days: value.maxTransitTimeDays,
    created_by: creatorId,
  }
}

export function toProjectDefinitionUpdate(
  input: ProjectDefinitionInput,
): ProjectDefinitionUpdate {
  const validation = validateProjectDefinition(input)
  const firstError = Object.values(validation.errors)[0]

  if (firstError) {
    throw new Error(firstError)
  }

  const value = validation.value
  return {
    activity_code: value.activityCode,
    title: value.projectTitle,
    owner_name: value.owner,
    contractor_name: value.contractor,
    owner_logo_path: value.ownerLogoUrl || null,
    contractor_logo_path: value.contractorLogoUrl || null,
    maximum_transit_time_days: value.maxTransitTimeDays,
  }
}
