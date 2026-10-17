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
  currentErectionStage?: ErectionStage | "not_started" | null
  rftBlockers: RftShortfallItem[]
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
  if (facts.currentErectionStage !== undefined && facts.currentErectionStage !== null) {
    return facts.currentErectionStage
  }
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
 * The open RFT criteria one by one. Returns the server-computed shortfall list directly.
 * Empty once the spool is RFT.
 */
export function listRftShortfall(facts: ErectionReadinessFacts): RftShortfallItem[] {
  if (facts.isRft) return []
  return facts.rftBlockers
}
