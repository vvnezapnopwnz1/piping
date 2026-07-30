import type {
  Capability,
  FunctionalRole,
  ProjectAccessRole,
} from "./capability"

export interface EffectiveAccess {
  projectId: string
  membershipId: string | null
  isPlatformAdmin: boolean
  accessRole: ProjectAccessRole | null
  functionalRoles: FunctionalRole[]
  capabilities: Capability[]
  subcontractorIds: string[]
  pdsAreaIds: string[]
}

export function hasCapability(
  access: EffectiveAccess,
  capability: Capability,
): boolean {
  return access.isPlatformAdmin || access.capabilities.includes(capability)
}

export function hasFunctionalRole(
  access: EffectiveAccess,
  role: FunctionalRole,
): boolean {
  return access.functionalRoles.includes(role)
}

export function isSubcontractorInScope(
  access: EffectiveAccess,
  subcontractorId: string | undefined,
): boolean {
  if (access.isPlatformAdmin || access.accessRole !== "subcontractor") {
    return true
  }

  return Boolean(
    subcontractorId && access.subcontractorIds.includes(subcontractorId),
  )
}

export function isPdsAreaInScope(
  access: EffectiveAccess,
  pdsAreaId: string | undefined,
): boolean {
  if (access.isPlatformAdmin || access.accessRole !== "subcontractor") {
    return true
  }

  return Boolean(pdsAreaId && access.pdsAreaIds.includes(pdsAreaId))
}
