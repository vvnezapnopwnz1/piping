import {
  evaluateReleaseEligibility,
  type FabricationReadiness,
} from "../domain/quality-release"
import type { FabricationGate } from "./record-material-check"

export function describeReleaseGate(readiness: FabricationReadiness): FabricationGate {
  const eligibility = evaluateReleaseEligibility(readiness)
  return eligibility.isReleasable
    ? { allowed: true, reason: null }
    : { allowed: false, reason: { code: "release_blockers", blockers: eligibility.blockers } }
}

/** Dossier 16.8: DFT is captured on the W10P and must clear the paint matrix requirement. */
export function describePaintGate(
  sentToPaintOn: string | null,
  requiredDftMicrons: number,
  measuredDftMicrons: number | null,
  w10pFormNumber: string | null,
): FabricationGate {
  if (!sentToPaintOn) {
    return { allowed: false, reason: { code: "sent_to_paint_first" } }
  }
  if (measuredDftMicrons !== null) {
    if (measuredDftMicrons < requiredDftMicrons) {
      return { allowed: false, reason: { code: "dft_below", measured: measuredDftMicrons, required: requiredDftMicrons } }
    }
    if (!w10pFormNumber || w10pFormNumber.trim() === "") {
      return { allowed: false, reason: { code: "w10p_required" } }
    }
  }
  return { allowed: true, reason: null }
}
