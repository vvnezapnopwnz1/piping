import type { ReferenceValidation } from "@/modules/project-setup/domain/reference"

export type TestPackMedium = "H" | "P" | "V"
export type TestPackLifecycle = "active" | "archived"

export interface CreateTestPackInput {
  testPackNumber: string
  location: string
  priority: string
  medium: string
  pressure: number
  volumeM3?: number
  plannedStartOn: string
  plannedEndOn: string
  systemId: string
  subsystemId: string
  serviceClassId: string
  lineServiceId: string
  isoIds: string[]
}
export type UpdateTestPackInput = Omit<CreateTestPackInput, "isoIds">

export interface TestPackDefinition {
  id: string
  projectId: string
  testPackNumber: string
  revisionNo: number
  systemId: string
  subsystemId: string
  serviceClassId: string
  lineServiceId: string
  pressureUnit: "bar" | "psi"
  plannedStartOn: string
  plannedEndOn: string
  priority: string
  medium: TestPackMedium
  pressure: number
  location: string
  volumeM3?: number
  lifecycle: TestPackLifecycle
  createdAt: string
  updatedAt: string
}

export interface TestPackMember {
  id: string
  testPackId: string
  projectId: string
  isometricId: string
  assignedIsometricRevisionId: string
  sourceKind: "manual" | "import"
  sourceImportJobId?: string
  removedAt?: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function requiredText(value: string, field: string, errors: Record<string, string>): string {
  const normalized = value.trim()
  if (!normalized) errors[field] = "required"
  return normalized
}

function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function normalizeTestPackInput(
  input: CreateTestPackInput,
): ReferenceValidation<CreateTestPackInput> {
  const errors: Record<string, string> = {}
  const testPackNumber = requiredText(input.testPackNumber, "testPackNumber", errors)
  const location = requiredText(input.location, "location", errors)
  const priority = requiredText(input.priority, "priority", errors)
  const medium = input.medium.trim().toUpperCase()
  if (!["H", "P", "V"].includes(medium)) errors.medium = "invalidMedium"

  if (!Number.isFinite(input.pressure) || input.pressure <= 0) {
    errors.pressure = "invalidPressure"
  }
  if (input.volumeM3 !== undefined && (!Number.isFinite(input.volumeM3) || input.volumeM3 <= 0)) {
    errors.volumeM3 = "invalidVolume"
  }

  if (!isIsoDate(input.plannedStartOn)) errors.plannedStartOn = "invalidPlannedStart"
  if (!isIsoDate(input.plannedEndOn)) errors.plannedEndOn = "invalidPlannedEnd"
  if (!errors.plannedStartOn && !errors.plannedEndOn && input.plannedEndOn < input.plannedStartOn) {
    errors.plannedEndOn = "endBeforeStart"
  }

  const systemId = input.systemId.trim()
  const subsystemId = input.subsystemId.trim()
  const serviceClassId = input.serviceClassId.trim()
  const lineServiceId = input.lineServiceId.trim()
  if (!systemId) errors.systemId = "required"
  if (!subsystemId) errors.subsystemId = "required"
  if (!serviceClassId) errors.serviceClassId = "required"
  if (!lineServiceId) errors.lineServiceId = "required"

  const isoIds = input.isoIds.map((id) => id.trim())
  const normalizedIsoIds = new Set(isoIds.filter(Boolean).map((id) => id.toUpperCase()))
  if (isoIds.some((id) => !id) || normalizedIsoIds.size !== isoIds.length) {
    errors.isoIds = "invalidIsoIds"
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      ...input,
      testPackNumber,
      location,
      priority,
      medium,
      plannedStartOn: input.plannedStartOn,
      plannedEndOn: input.plannedEndOn,
      systemId,
      subsystemId,
      serviceClassId,
      lineServiceId,
      isoIds,
    },
    errors: {},
  }
}
