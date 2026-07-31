import { validateReferenceIdentity, type ReferenceValidation, type ReferenceStatus } from "./reference"

export type ProjectTeamType = "line_check" | "blinding" | "finishing" | "reinstatement" | "jointer"

export interface ProjectTeamInput {
  code: string
  description: string
  teamType: ProjectTeamType
}

export interface ProjectTeam {
  id: string
  projectId: string
  code: string
  description: string
  teamType: ProjectTeamType
  status: ReferenceStatus
}

export interface ProjectSystemInput {
  code: string
  description: string
}

export interface ProjectSystem {
  id: string
  projectId: string
  code: string
  description: string
  status: ReferenceStatus
}

export interface ProjectSubsystemInput {
  systemId: string
  code: string
  description: string
}

export interface ProjectSubsystem {
  id: string
  projectId: string
  systemId: string
  systemCode?: string
  code: string
  description: string
  status: ReferenceStatus
}

export interface LineServiceInput {
  code: string
  description: string
}

export interface LineService {
  id: string
  projectId: string
  code: string
  description: string
  status: ReferenceStatus
}

export interface LocationCategoryInput {
  code: string
  description: string
}

export interface LocationCategory {
  id: string
  projectId: string
  code: string
  description: string
  status: ReferenceStatus
}

export interface LocationInput {
  categoryId: string
  code: string
  description: string
  mappedProgressColumns: string[]
}

export interface Location {
  id: string
  projectId: string
  categoryId: string
  categoryCode?: string
  code: string
  description: string
  mappedProgressColumns: string[]
  status: ReferenceStatus
}

export interface PressureUnitInput {
  unit: "bar" | "psi" | "kpa" | "mpascal"
}

export interface PressureUnit {
  projectId: string
  unit: "bar" | "psi" | "kpa" | "mpascal"
}

export interface UnitTimeReferenceInput {
  activity: string
  projectUt: number
  standardReference: string
}

export interface UnitTimeReference {
  id: string
  projectId: string
  activity: string
  projectUt: number
  standardReference: string
  status: ReferenceStatus
}

export function validateProjectTeamInput(input: ProjectTeamInput): ReferenceValidation<ProjectTeamInput> {
  const base = validateReferenceIdentity(input)
  if (!base.ok) return base
  if (!["line_check", "blinding", "finishing", "reinstatement", "jointer"].includes(input.teamType)) {
    return { ok: false, errors: { teamType: "Invalid team type" } }
  }
  return { ok: true, value: { ...base.value, teamType: input.teamType }, errors: {} }
}

export function validateSubsystemInput(input: ProjectSubsystemInput): ReferenceValidation<ProjectSubsystemInput> {
  const base = validateReferenceIdentity(input)
  if (!base.ok) return base
  if (!input.systemId) {
    return { ok: false, errors: { systemId: "Parent system is required" } }
  }
  return { ok: true, value: { ...base.value, systemId: input.systemId }, errors: {} }
}

export function validateLocationInput(input: LocationInput): ReferenceValidation<LocationInput> {
  const base = validateReferenceIdentity(input)
  if (!base.ok) return base
  if (!input.categoryId) {
    return { ok: false, errors: { categoryId: "Location category is required" } }
  }
  return {
    ok: true,
    value: {
      ...base.value,
      categoryId: input.categoryId,
      mappedProgressColumns: input.mappedProgressColumns || [],
    },
    errors: {},
  }
}

export function validatePressureUnitInput(input: PressureUnitInput): ReferenceValidation<PressureUnitInput> {
  if (!["bar", "psi", "kpa", "mpascal"].includes(input.unit)) {
    return { ok: false, errors: { unit: "Invalid pressure unit" } }
  }
  return { ok: true, value: input, errors: {} }
}

export function validateUnitTimeReferenceInput(input: UnitTimeReferenceInput): ReferenceValidation<UnitTimeReferenceInput> {
  const code = input.activity.trim().toUpperCase()
  if (!code) return { ok: false, errors: { activity: "Activity code is required" } }
  if (typeof input.projectUt !== "number" || input.projectUt <= 0) {
    return { ok: false, errors: { projectUt: "Project UT must be a positive number" } }
  }
  return { ok: true, value: { activity: code, projectUt: input.projectUt, standardReference: input.standardReference.trim() }, errors: {} }
}
