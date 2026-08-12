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

type AccessMemberField =
  | "functionalRoles"
  | "subcontractorIds"
  | "pdsAreaIds"

export type AccessMemberValidationResult =
  | { ok: true; value: AccessMemberInput }
  | { ok: false; fieldErrors: Partial<Record<AccessMemberField, string>> }

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

  const fieldErrors: Partial<Record<AccessMemberField, string>> = {}
  if (value.functionalRoles.length === 0) {
    fieldErrors.functionalRoles = "Select at least one functional role."
  }
  if (value.subcontractorIds.length === 0) {
    fieldErrors.subcontractorIds = "Select at least one subcontractor."
  }
  if (value.pdsAreaIds.length === 0) {
    fieldErrors.pdsAreaIds = "Select at least one PDS area."
  }

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, fieldErrors }
    : { ok: true, value }
}
