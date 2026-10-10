import type { SetupFieldIssue } from "./issue"

export interface FilmQuantityRule {
  id: string
  diameterFromInch: number
  diameterToInch: number
  thicknessFromMm: number
  thicknessToMm: number
  filmCount: number
}

export interface UtCalculationRule {
  id: string
  diameterFromInch: number
  diameterToInch: number
  coefficientDiameter: number
  coefficientRating: number
  flangeRating?: string | null
}

// i18n-ignore — legacy torquing method codes
export const TORQUING_METHODS = ["Manual", "Torquing", "Tensioning"] as const

export type SystemReferenceEntryKind = "material_type" | "torquing_requirement"

export interface TorquingRequirementInput {
  code: string
  description: string
}

export interface UtCalculationRuleInput {
  diameterFromInch: number
  diameterToInch: number
  coefficientDiameter: number
  coefficientRating: number
  flangeRating?: string | null
}

type SystemReferenceValidation<T> =
  | { ok: true; value: T; errors: Record<string, never> }
  | { ok: false; errors: Record<string, SetupFieldIssue> }

export interface SystemReferenceEntry {
  id: string
  kind: SystemReferenceEntryKind
  code: string
  description: string
  status: "active" | "inactive" | "archived"
  createdAt?: string
  updatedAt?: string
}

export function validateTorquingRequirementInput(
  input: TorquingRequirementInput,
): SystemReferenceValidation<TorquingRequirementInput> {
  const code = input.code.trim().toUpperCase()
  const description = input.description.trim()
  const errors: Record<string, SetupFieldIssue> = {}
  if (!code) errors.code = { code: "required" }
  if (!description) errors.description = { code: "required" }
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { code, description }, errors: {} }
}

export function validateFilmQuantityRuleInput(input: {
  diameterFromInch: number
  diameterToInch: number
  thicknessFromMm: number
  thicknessToMm: number
  filmCount: number
}): { ok: boolean; errors: Record<string, SetupFieldIssue> } {
  const errors: Record<string, SetupFieldIssue> = {}
  if (input.diameterFromInch <= 0) {
    errors.diameterFromInch = { code: "positive" }
  }
  if (input.diameterToInch < input.diameterFromInch) {
    errors.diameterToInch = { code: "greater_or_equal", minField: "diameterFromInch" }
  }
  if (input.thicknessFromMm < 0) {
    errors.thicknessFromMm = { code: "non_negative" }
  }
  if (input.thicknessToMm < input.thicknessFromMm) {
    errors.thicknessToMm = { code: "greater_or_equal", minField: "thicknessFromMm" }
  }
  if (input.filmCount <= 0 || !Number.isInteger(input.filmCount)) {
    errors.filmCount = { code: "positive_integer" }
  }
  return { ok: Object.keys(errors).length === 0, errors }
}

export function validateUtCalculationRuleInput(
  input: UtCalculationRuleInput,
): SystemReferenceValidation<UtCalculationRuleInput> {
  const errors: Record<string, SetupFieldIssue> = {}
  if (!Number.isFinite(input.diameterFromInch) || input.diameterFromInch <= 0) {
    errors.diameterFromInch = { code: "positive" }
  }
  if (!Number.isFinite(input.diameterToInch) || input.diameterToInch < input.diameterFromInch) {
    errors.diameterToInch = { code: "greater_or_equal", minField: "diameterFromInch" }
  }
  if (!Number.isFinite(input.coefficientDiameter) || input.coefficientDiameter <= 0) {
    errors.coefficientDiameter = { code: "positive" }
  }
  if (!Number.isFinite(input.coefficientRating) || input.coefficientRating <= 0) {
    errors.coefficientRating = { code: "positive" }
  }
  const flangeRating = input.flangeRating == null ? null : input.flangeRating.trim().toUpperCase()
  if (input.flangeRating != null && !flangeRating) {
    errors.flangeRating = { code: "not_blank" }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      diameterFromInch: input.diameterFromInch,
      diameterToInch: input.diameterToInch,
      coefficientDiameter: input.coefficientDiameter,
      coefficientRating: input.coefficientRating,
      flangeRating,
    },
    errors: {},
  }
}
