export interface RftInputs {
  weldedBoltedOn: string | null
  supportedOn: string | null
  ndePending: number
  pwhtPending: number
  /** Phase-agnostic: one material check per spool revision, from either phase (T07-D2). */
  materialCheckedOn?: string | null
  lastFieldWeldOn?: string | null
  lastFieldSupportOn?: string | null
}

export interface RftResult {
  isRft: boolean
  rftOn: string | null
}

export function deriveRft(input: RftInputs): RftResult {
  const isRft =
    Boolean(input.weldedBoltedOn) &&
    Boolean(input.supportedOn) &&
    input.ndePending === 0 &&
    input.pwhtPending === 0

  if (!isRft) return { isRft: false, rftOn: null }

  const dates = [
    input.weldedBoltedOn,
    input.supportedOn,
    input.materialCheckedOn ?? null,
    input.lastFieldWeldOn ?? null,
    input.lastFieldSupportOn ?? null,
  ].filter((date): date is string => Boolean(date))

  return { isRft: true, rftOn: dates.sort().at(-1) ?? null }
}
