export type FlangeProgressState = "not_started" | "completed" | "revision_mismatch"

export interface FlangeProgressInput {
  projectId: string
  flangeJointRevisionId: string
  jointCategoryId: string
  torquingRequirementId: string
  jointingValue: number
  jointDate: string
  reportNumber: string
  tagNumber: string
  jointerIds: readonly string[]
  idempotencyKey: string
  replacesProgressId?: string
}

export type NormalizedFlangeProgressInput = Omit<FlangeProgressInput, "jointerIds"> & {
  jointerIds: string[]
}

export type FlangeProgressValidation<T> =
  | { ok: true; value: T; errors: Record<string, never> }
  | { ok: false; errors: Record<string, string> }

export function normalizeFlangeProgressInput(
  input: FlangeProgressInput,
  now = new Date(),
): FlangeProgressValidation<NormalizedFlangeProgressInput> {
  const errors: Record<string, string> = {}
  const requiredIds = [
    ["projectId", input.projectId],
    ["flangeJointRevisionId", input.flangeJointRevisionId],
    ["jointCategoryId", input.jointCategoryId],
    ["torquingRequirementId", input.torquingRequirementId],
    ["idempotencyKey", input.idempotencyKey],
  ] as const
  for (const [name, value] of requiredIds) {
    if (!value.trim()) errors[name] = `${name} is required`
  }

  const reportNumber = input.reportNumber.trim()
  const tagNumber = input.tagNumber.trim()
  if (!reportNumber) errors.reportNumber = "Report number is required"
  if (!tagNumber) errors.tagNumber = "Tag number is required"
  if (!Number.isFinite(input.jointingValue) || input.jointingValue <= 0) {
    errors.jointingValue = "Jointing value must be positive and finite"
  }

  const jointDate = input.jointDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jointDate)) {
    errors.jointDate = "Joint date must use YYYY-MM-DD"
  } else {
    const parsed = new Date(`${jointDate}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime())) errors.jointDate = "Joint date is invalid"
    if (jointDate > now.toISOString().slice(0, 10)) errors.jointDate = "Joint date cannot be in the future"
  }

  const jointerIds: string[] = []
  const seen = new Set<string>()
  for (const rawId of input.jointerIds) {
    const id = rawId.trim()
    if (!id) continue
    const key = id.toUpperCase()
    if (seen.has(key)) {
      errors.jointerIds = "Jointer IDs must be unique"
      continue
    }
    seen.add(key)
    jointerIds.push(id)
  }
  if (jointerIds.length === 0) errors.jointerIds = "At least one jointer is required"

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      ...input,
      projectId: input.projectId.trim(),
      flangeJointRevisionId: input.flangeJointRevisionId.trim(),
      jointCategoryId: input.jointCategoryId.trim(),
      torquingRequirementId: input.torquingRequirementId.trim(),
      jointDate,
      reportNumber,
      tagNumber,
      idempotencyKey: input.idempotencyKey.trim(),
      jointerIds,
    },
    errors: {},
  }
}

export function deriveFlangeProgressState(input: {
  hasEffectiveProgress: boolean
  isCurrentRevision: boolean
  isRemoved: boolean
}): FlangeProgressState {
  if (!input.isCurrentRevision || input.isRemoved) return "revision_mismatch"
  return input.hasEffectiveProgress ? "completed" : "not_started"
}

export function isFlangeProgressCopyAllowed(decision: string): boolean {
  return decision === "done_without_modification"
}
