export interface FlangeUtRule {
  diameterFromInch: number
  diameterToInch: number
  flangeRating?: string | null
  coefficientDiameter: number
  coefficientRating: number
}

export interface FlangeUtInputs {
  projectQuantity: number | null
  coefficientDiameter: number | null
  coefficientRating: number | null
  coefficientPunch: number | null
}

export interface FlangeUtSnapshot extends FlangeUtInputs {
  formulaVersion: "flange-ut-v1"
  calculatedUt: number | null
  warning?: "UT not configured"
}

const normalizedRating = (value: string | null | undefined): string | null => {
  const normalized = value?.trim().toUpperCase() ?? ""
  return normalized || null
}

export function selectFlangeUtRule(
  rules: readonly FlangeUtRule[],
  diameterInch: number,
  flangeRating: string | null | undefined,
): FlangeUtRule | null {
  const matching = rules.filter(
    (rule) => diameterInch >= rule.diameterFromInch && diameterInch <= rule.diameterToInch,
  )
  const requestedRating = normalizedRating(flangeRating)
  return (
    matching.find((rule) => normalizedRating(rule.flangeRating) === requestedRating && requestedRating !== null) ??
    matching.find((rule) => normalizedRating(rule.flangeRating) === null) ??
    null
  )
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be positive and finite`)
  }
}

export function calculateFlangeUt(inputs: FlangeUtInputs): FlangeUtSnapshot {
  const values = [
    ["projectQuantity", inputs.projectQuantity],
    ["coefficientDiameter", inputs.coefficientDiameter],
    ["coefficientRating", inputs.coefficientRating],
    ["coefficientPunch", inputs.coefficientPunch],
  ] as const
  const missing = values.some(([, value]) => value === null || value === undefined)
  if (missing) {
    return { ...inputs, formulaVersion: "flange-ut-v1", calculatedUt: null, warning: "UT not configured" }
  }

  for (const [name, value] of values) assertPositiveFinite(value as number, name)
  return {
    ...inputs,
    formulaVersion: "flange-ut-v1",
    calculatedUt: (inputs.projectQuantity as number)
      * (inputs.coefficientDiameter as number)
      * (inputs.coefficientRating as number)
      * (inputs.coefficientPunch as number),
  }
}
