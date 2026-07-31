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
}

export const TORQUING_METHODS = [
  "Manual",
  "Torquing",
  "Tensioning",
] as const

export interface SystemReferenceEntry {
  id: string
  kind: "material_type"
  code: string
  description: string
  status: "active" | "inactive" | "archived"
  createdAt?: string
  updatedAt?: string
}

export function validateFilmQuantityRuleInput(input: {
  diameterFromInch: number
  diameterToInch: number
  thicknessFromMm: number
  thicknessToMm: number
  filmCount: number
}): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  if (input.diameterFromInch <= 0) {
    errors.diameterFromInch = "Diameter from must be positive"
  }
  if (input.diameterToInch < input.diameterFromInch) {
    errors.diameterToInch = "Diameter to must be >= diameter from"
  }
  if (input.thicknessFromMm < 0) {
    errors.thicknessFromMm = "Thickness from must be non-negative"
  }
  if (input.thicknessToMm < input.thicknessFromMm) {
    errors.thicknessToMm = "Thickness to must be >= thickness from"
  }
  if (input.filmCount <= 0 || !Number.isInteger(input.filmCount)) {
    errors.filmCount = "Film count must be a positive integer"
  }
  return { ok: Object.keys(errors).length === 0, errors }
}

export function validateUtCalculationRuleInput(input: {
  diameterFromInch: number
  diameterToInch: number
  coefficientDiameter: number
  coefficientRating: number
}): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  if (input.diameterFromInch <= 0) {
    errors.diameterFromInch = "Diameter from must be positive"
  }
  if (input.diameterToInch < input.diameterFromInch) {
    errors.diameterToInch = "Diameter to must be >= diameter from"
  }
  if (input.coefficientDiameter < 0) {
    errors.coefficientDiameter = "Coefficient diameter must be non-negative"
  }
  if (input.coefficientRating < 0) {
    errors.coefficientRating = "Coefficient rating must be non-negative"
  }
  return { ok: Object.keys(errors).length === 0, errors }
}
