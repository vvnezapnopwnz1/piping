/** Mirrors one row of `public.spool_fabrication_readiness`. */
export interface FabricationReadiness {
  lineTotal: number
  lineChecked: number
  weldTotal: number
  weldComplete: number
  supportTotal: number
  supportRecorded: number
  ndePending: number
  pwhtPending: number
  revisionStatus: string
}

export interface ReleaseEligibility {
  isFabricated: boolean
  isReleasable: boolean
  blockers: string[]
}

/**
 * Dossier 16.6 and 16.7. The same four gates `release_quality_record` applies, so the
 * disabled button and the RPC rejection say the same thing — roadmap 17 requires it.
 */
export function evaluateReleaseEligibility(
  readiness: FabricationReadiness,
): ReleaseEligibility {
  const blockers: string[] = []

  if (readiness.revisionStatus !== "accepted") {
    blockers.push(
      `This spool revision is ${readiness.revisionStatus} and no longer accepts progress.`,
    )
  }
  if (readiness.lineTotal === 0 || readiness.lineChecked < readiness.lineTotal) {
    blockers.push(
      `Material check is incomplete: ${readiness.lineChecked} of ${readiness.lineTotal} bill lines traced.`,
    )
  }
  if (readiness.weldComplete < readiness.weldTotal) {
    blockers.push(
      `Welding is incomplete: ${readiness.weldComplete} of ${readiness.weldTotal} joints welded.`,
    )
  }
  if (readiness.supportRecorded < readiness.supportTotal) {
    blockers.push(
      `Supports are incomplete: ${readiness.supportRecorded} of ${readiness.supportTotal} installed.`,
    )
  }
  if (readiness.ndePending > 0) {
    blockers.push(`${readiness.ndePending} NDE obligations are still outstanding.`)
  }
  if (readiness.pwhtPending > 0) {
    blockers.push(`${readiness.pwhtPending} joints still need an accepted PWHT result.`)
  }

  const isFabricated =
    readiness.revisionStatus === "accepted" &&
    readiness.lineTotal > 0 &&
    readiness.lineChecked >= readiness.lineTotal &&
    readiness.weldComplete >= readiness.weldTotal &&
    readiness.supportRecorded >= readiness.supportTotal

  return { isFabricated, isReleasable: blockers.length === 0, blockers }
}
