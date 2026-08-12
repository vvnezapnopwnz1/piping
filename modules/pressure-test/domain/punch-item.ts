import type { ReferenceValidation } from "@/modules/project-setup/domain/reference"

export interface PunchItem {
  id: string
  projectId: string
  testPackId: string
  isometricId: string
  spoolId?: string
  punchCodeId: string
  itemNumber: string
  description: string
  checkingDate: string
  completionDate?: string
  clearedAt?: string
}
export interface LineCheckAssignment {
  testPackId: string
  isometricIds: string[]
  teamId: string
  assignedDate: string
}

export interface LineCheckResult {
  requestId: string
  isometricId: string
  completedDate: string
  punchItems: PunchItem[]
}

export interface ItemClearanceAssignment {
  testPackId: string
  punchItemIds: string[]
  teamId: string
  assignedDate: string
}

export interface PunchItemInput {
  testPackId: string
  isometricId: string
  spoolId?: string
  punchCodeId: string
  description: string
  checkingDate: string
  completionDate?: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function validDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function required(value: string, field: string, errors: Record<string, string>): string {
  const normalized = value.trim()
  if (!normalized) errors[field] = `${field} is required`
  return normalized
}

export function normalizePunchItemInput(input: PunchItemInput): ReferenceValidation<PunchItemInput> {
  const errors: Record<string, string> = {}
  const testPackId = required(input.testPackId, "testPackId", errors)
  const isometricId = required(input.isometricId, "isometricId", errors)
  const punchCodeId = required(input.punchCodeId, "punchCodeId", errors)
  const description = required(input.description, "description", errors)
  const checkingDate = input.checkingDate.trim()
  const completionDate = input.completionDate?.trim()
  if (!validDate(checkingDate)) errors.checkingDate = "Checking date must be an ISO date"
  if (completionDate && !validDate(completionDate)) errors.completionDate = "Completion date must be an ISO date"
  if (completionDate && validDate(checkingDate) && completionDate < checkingDate) errors.completionDate = "Completion date cannot be before checking date"
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: { ...input, testPackId, isometricId, punchCodeId, description, checkingDate, completionDate, spoolId: input.spoolId?.trim() || undefined },
    errors: {},
  }
}

export function normalizeLineCheckAssignment(input: LineCheckAssignment): ReferenceValidation<LineCheckAssignment> {
  const errors: Record<string, string> = {}
  const testPackId = required(input.testPackId, "testPackId", errors)
  const teamId = required(input.teamId, "teamId", errors)
  const assignedDate = input.assignedDate.trim()
  if (!validDate(assignedDate)) errors.assignedDate = "Assigned date must be an ISO date"
  const isometricIds = input.isometricIds.map((id) => id.trim())
  if (isometricIds.length === 0 || isometricIds.some((id) => !id) || new Set(isometricIds).size !== isometricIds.length) {
    errors.isometricIds = "At least one unique ISO is required"
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { testPackId, teamId, assignedDate, isometricIds }, errors: {} }
}

export function normalizeItemClearanceAssignment(input: ItemClearanceAssignment): ReferenceValidation<ItemClearanceAssignment> {
  const base = normalizeLineCheckAssignment({ testPackId: input.testPackId, isometricIds: input.punchItemIds, teamId: input.teamId, assignedDate: input.assignedDate })
  if (!base.ok) return base
  return { ok: true, value: { ...input, ...base.value, punchItemIds: base.value.isometricIds }, errors: {} }
}
