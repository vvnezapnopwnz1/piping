/** Matches the `public.ndt_method` enum. `vt` exists in the enum but has no matrix column. */
export const NDT_METHODS = ["rt", "ut", "mt", "pt", "pmi", "ht", "vt"] as const
export type NdtMethod = (typeof NDT_METHODS)[number]

export interface NdeMatrixRule {
  id: string
  rtCoverage: number
  utCoverage: number
  mtCoverage: number
  ptCoverage: number
  pmiCoverage: number
  htCoverage: number
  pwhtRequired: boolean
  pwhtThresholdMm: number | null
}

export interface DerivedObligation {
  method: NdtMethod
  requiredCoverage: number
  selectionMode: "full" | "spot"
}

const COVERAGE_FIELDS: readonly (readonly [NdtMethod, keyof NdeMatrixRule])[] = [
  ["rt", "rtCoverage"],
  ["ut", "utCoverage"],
  ["mt", "mtCoverage"],
  ["pt", "ptCoverage"],
  ["pmi", "pmiCoverage"],
  ["ht", "htCoverage"],
]

/**
 * Dossier 11.9. One obligation per covered method. A full obligation must be examined; a
 * spot obligation is what Track 06 allocates into batches. This mirrors
 * `public.generate_weld_obligations`; the database copy is the authority.
 */
export function deriveObligations(rule: NdeMatrixRule): DerivedObligation[] {
  const obligations: DerivedObligation[] = []

  for (const [method, field] of COVERAGE_FIELDS) {
    const coverage = Number(rule[field] ?? 0)
    if (coverage <= 0) continue
    obligations.push({
      method,
      requiredCoverage: coverage,
      selectionMode: coverage >= 100 ? "full" : "spot",
    })
  }

  return obligations
}

/** A null thickness cannot clear a threshold, so it does not create a requirement. */
export function requiresPwht(rule: NdeMatrixRule, thicknessMm: number | null): boolean {
  if (!rule.pwhtRequired) return false
  if (rule.pwhtThresholdMm === null) return true
  if (thicknessMm === null) return false
  return thicknessMm >= rule.pwhtThresholdMm
}
