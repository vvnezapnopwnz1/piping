import type { ErectionStageEvidence } from "./record-erection-progress"

/**
 * The subset of `spool_erection_readiness` these projections read. Kept structural rather than
 * importing `ErectionReadiness` so the application layer does not depend on the infrastructure
 * row shape.
 */
export interface ErectionReadinessFacts extends ErectionStageEvidence {
  ndePending: number
  pwhtPending: number
  isRft: boolean
  rftOn: string | null
}

export function toStageEvidence(facts: ErectionReadinessFacts): ErectionStageEvidence {
  return {
    toSiteOn: facts.toSiteOn,
    erectedOn: facts.erectedOn,
    weldedBoltedOn: facts.weldedBoltedOn,
    supportedOn: facts.supportedOn,
  }
}

/** The furthest stage the spool has reached, for the picker badge and the readiness table. */
export function currentErectionStageLabel(facts: ErectionReadinessFacts): string {
  if (facts.isRft) return "rft"
  if (facts.supportedOn) return "supported"
  if (facts.weldedBoltedOn) return "welded/bolted"
  if (facts.erectedOn) return "erected"
  if (facts.toSiteOn) return "to site"
  return "not started"
}

export type RftShortfallKind = "welded_bolted" | "supported" | "nde" | "pwht"

export interface RftShortfallItem {
  kind: RftShortfallKind
  label: string
}

/**
 * The open RFT criteria one by one, in the order `spool_erection_readiness` evaluates them, so
 * each can lead to the screen where it is resolved. Empty once the spool is RFT.
 */
export function listRftShortfall(facts: ErectionReadinessFacts): RftShortfallItem[] {
  if (facts.isRft) return []

  const missing: RftShortfallItem[] = []
  if (!facts.weldedBoltedOn) missing.push({ kind: "welded_bolted", label: "Welded / Bolted is not recorded" })
  if (!facts.supportedOn) missing.push({ kind: "supported", label: "Supported is not recorded" })
  if (facts.ndePending > 0) missing.push({ kind: "nde", label: `${facts.ndePending} NDE obligation(s) open` })
  if (facts.pwhtPending > 0) missing.push({ kind: "pwht", label: `${facts.pwhtPending} PWHT requirement(s) open` })
  return missing
}

/**
 * Why RFT is still closed, in the order `spool_erection_readiness` evaluates it. Returns null
 * once the spool is RFT — there is nothing outstanding to say.
 */
export function describeRftShortfall(facts: ErectionReadinessFacts): string | null {
  if (facts.isRft) return null

  const missing = listRftShortfall(facts).map((item) => item.label)

  // is_rft is a projection of exactly these four facts, so an empty list here would mean the
  // view and this function disagree. Say so rather than rendering an empty sentence.
  if (missing.length === 0) {
    return "RFT is closed but no outstanding evidence is reported; reload the page."
  }

  return `${missing.join("; ")}.`
}
