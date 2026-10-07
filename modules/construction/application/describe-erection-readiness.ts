import type { ErectionStage } from "../domain/erection-stage"
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
export function currentErectionStage(facts: ErectionReadinessFacts): ErectionStage | "not_started" {
  if (facts.isRft) return "rft"
  if (facts.supportedOn) return "supported"
  if (facts.weldedBoltedOn) return "welded_bolted"
  if (facts.erectedOn) return "erected"
  if (facts.toSiteOn) return "to_site"
  return "not_started"
}

export type RftShortfallKind = "welded_bolted" | "supported" | "nde" | "pwht"

/** One open RFT criterion; `count` is the number of open NDE obligations or PWHT requirements. */
export interface RftShortfallItem {
  kind: RftShortfallKind
  count?: number
}

/**
 * The open RFT criteria one by one, in the order `spool_erection_readiness` evaluates them, so
 * each can lead to the screen where it is resolved. Empty once the spool is RFT.
 */
export function listRftShortfall(facts: ErectionReadinessFacts): RftShortfallItem[] {
  if (facts.isRft) return []

  const missing: RftShortfallItem[] = []
  if (!facts.weldedBoltedOn) missing.push({ kind: "welded_bolted" })
  if (!facts.supportedOn) missing.push({ kind: "supported" })
  if (facts.ndePending > 0) missing.push({ kind: "nde", count: facts.ndePending })
  if (facts.pwhtPending > 0) missing.push({ kind: "pwht", count: facts.pwhtPending })
  return missing
}
