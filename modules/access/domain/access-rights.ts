import type { FunctionalRole, ProjectAccessRole } from "./capability"

export interface AccessMemberInput {
  accessRole: ProjectAccessRole
  functionalRoles: FunctionalRole[]
  subcontractorIds: string[]
  pdsAreaIds: string[]
}

export interface AccessMemberRow extends AccessMemberInput {
  membershipId: string
  userId: string
  fullName: string
  email: string
  isActive: boolean
}

export type AccessMemberField =
  | "functionalRoles"
  | "subcontractorIds"
  | "pdsAreaIds"

export type AccessMemberIssueCode =
  | "at_least_one_functional_role"
  | "at_least_one_subcontractor"
  | "at_least_one_pds_area"

export type AccessMemberValidationResult =
  | { ok: true; value: AccessMemberInput }
  | { ok: false; fieldErrors: Partial<Record<AccessMemberField, AccessMemberIssueCode>> }

function uniqueStable<Value>(values: readonly Value[]): Value[] {
  return [...new Set(values)]
}

export function normalizeAccessMemberEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateAccessMemberInput(input: {
  accessRole: ProjectAccessRole
  functionalRoles: readonly FunctionalRole[]
  subcontractorIds: readonly string[]
  pdsAreaIds: readonly string[]
}): AccessMemberValidationResult {
  const value: AccessMemberInput = {
    accessRole: input.accessRole,
    functionalRoles: uniqueStable(input.functionalRoles),
    subcontractorIds:
      input.accessRole === "subcontractor"
        ? uniqueStable(input.subcontractorIds)
        : [],
    pdsAreaIds:
      input.accessRole === "subcontractor" ? uniqueStable(input.pdsAreaIds) : [],
  }

  if (value.accessRole !== "subcontractor") {
    return { ok: true, value }
  }

  const fieldErrors: Partial<Record<AccessMemberField, AccessMemberIssueCode>> = {}
  if (value.functionalRoles.length === 0) {
    fieldErrors.functionalRoles = "at_least_one_functional_role"
  }
  if (value.subcontractorIds.length === 0) {
    fieldErrors.subcontractorIds = "at_least_one_subcontractor"
  }
  if (value.pdsAreaIds.length === 0) {
    fieldErrors.pdsAreaIds = "at_least_one_pds_area"
  }

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, fieldErrors }
    : { ok: true, value }
}
