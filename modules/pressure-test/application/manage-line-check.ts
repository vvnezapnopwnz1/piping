import { normalizeItemClearanceAssignment, normalizeLineCheckAssignment, normalizePunchItemInput, type ItemClearanceAssignment, type LineCheckAssignment, type PunchItemInput } from "../domain/punch-item"
import { assignItemClearance, assignLineCheck, recordLineCheckResult } from "../infrastructure/supabase-pressure-test-repository"

const key = (prefix: string) => `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`

export async function assignManagedLineCheck(repository: Parameters<typeof assignLineCheck>[0], input: LineCheckAssignment, idempotencyKey = key("assign-line-check")) {
  const validation = normalizeLineCheckAssignment(input)
  if (!validation.ok) return validation
  return { ok: true as const, value: await assignLineCheck(repository, validation.value, idempotencyKey) }
}
export async function recordManagedLineCheckResult(repository: Parameters<typeof recordLineCheckResult>[0], requestId: string, isometricId: string, completedDate: string, punches: PunchItemInput[], idempotencyKey = key("line-check-result")) {
  const normalized = punches.map(normalizePunchItemInput)
  const invalid = normalized.find((item) => !item.ok)
  if (invalid && !invalid.ok) return invalid
  return { ok: true as const, value: await recordLineCheckResult(repository, requestId, isometricId, completedDate, normalized.map((item) => item.ok ? item.value : item) as PunchItemInput[], idempotencyKey) }
}

export async function assignManagedItemClearance(repository: Parameters<typeof assignItemClearance>[0], input: ItemClearanceAssignment, idempotencyKey = key("assign-item-clearance")) {
  const validation = normalizeItemClearanceAssignment(input)
  if (!validation.ok) return validation
  return { ok: true as const, value: await assignItemClearance(repository, validation.value, idempotencyKey) }
}
