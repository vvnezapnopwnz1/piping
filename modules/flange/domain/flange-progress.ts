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

/** Why a flange record is refused, per field; the screen words it from flange.validation. */
export type FlangeValidationCode =
  | "required" | "report_required" | "tag_required" | "jointing_value_invalid"
  | "date_format" | "date_invalid" | "date_future" | "jointers_unique" | "jointers_required"

export type FlangeProgressValidation<T> =
  | { ok: true; value: T; errors: Record<string, never> }
  | { ok: false; errors: Record<string, FlangeValidationCode> }

export function normalizeFlangeProgressInput(
  input: FlangeProgressInput,
  now = new Date(),
): FlangeProgressValidation<NormalizedFlangeProgressInput> {
  const errors: Record<string, FlangeValidationCode> = {}
  const requiredIds = [
    ["projectId", input.projectId],
    ["flangeJointRevisionId", input.flangeJointRevisionId],
    ["jointCategoryId", input.jointCategoryId],
    ["torquingRequirementId", input.torquingRequirementId],
    ["idempotencyKey", input.idempotencyKey],
  ] as const
  for (const [name, value] of requiredIds) {
    if (!value.trim()) errors[name] = "required"
  }

  const reportNumber = input.reportNumber.trim()
  const tagNumber = input.tagNumber.trim()
  if (!reportNumber) errors.reportNumber = "report_required"
  if (!tagNumber) errors.tagNumber = "tag_required"
  if (!Number.isFinite(input.jointingValue) || input.jointingValue <= 0) {
    errors.jointingValue = "jointing_value_invalid"
  }

  const jointDate = input.jointDate.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jointDate)) {
    errors.jointDate = "date_format"
  } else {
    const parsed = new Date(`${jointDate}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime())) errors.jointDate = "date_invalid"
    if (jointDate > now.toISOString().slice(0, 10)) errors.jointDate = "date_future"
  }

  const jointerIds: string[] = []
  const seen = new Set<string>()
  for (const rawId of input.jointerIds) {
    const id = rawId.trim()
    if (!id) continue
    const key = id.toUpperCase()
    if (seen.has(key)) {
      errors.jointerIds = "jointers_unique"
      continue
    }
    seen.add(key)
    jointerIds.push(id)
  }
  if (jointerIds.length === 0) errors.jointerIds = "jointers_required"

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
