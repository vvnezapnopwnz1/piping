import {
  evaluateReleaseEligibility,
  type FabricationReadiness,
} from "../domain/quality-release"
import type { Gate } from "./record-material-check"

export function describeReleaseGate(readiness: FabricationReadiness): Gate {
  const eligibility = evaluateReleaseEligibility(readiness)
  return eligibility.isReleasable
    ? { allowed: true, reason: null }
    : { allowed: false, reason: eligibility.blockers.join(" ") }
}

/** Dossier 16.8: DFT is captured on the W10P and must clear the paint matrix requirement. */
export function describePaintGate(
  sentToPaintOn: string | null,
  requiredDftMicrons: number,
  measuredDftMicrons: number | null,
  w10pFormNumber: string | null,
): Gate {
  if (!sentToPaintOn) {
    return {
      allowed: false,
      reason: "Record Sent to Paint before recording painting activities.",
    }
  }
  if (measuredDftMicrons !== null) {
    if (measuredDftMicrons < requiredDftMicrons) {
      return {
        allowed: false,
        reason: `The measured DFT of ${measuredDftMicrons} microns is below the required ${requiredDftMicrons} microns.`,
      }
    }
    if (!w10pFormNumber || w10pFormNumber.trim() === "") {
      return { allowed: false, reason: "A DFT measurement requires the W10P form number." }
    }
  }
  return { allowed: true, reason: null }
}
