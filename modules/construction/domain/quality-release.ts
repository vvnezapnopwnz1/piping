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

/** One reason QC release is closed. The interface words it from `code` (fabrication.releaseBlocker). */
export interface ReleaseBlocker {
  code: "revision_not_accepted" | "material_incomplete" | "welding_incomplete" | "supports_incomplete" | "nde_open" | "pwht_open"
  values: Record<string, string | number>
}

export interface ReleaseEligibility {
  isFabricated: boolean
  isReleasable: boolean
  blockers: ReleaseBlocker[]
}

/**
 * Dossier 16.6 and 16.7. The same four gates `release_quality_record` applies, so the
 * disabled button and the RPC rejection say the same thing — roadmap 17 requires it.
 */
export function evaluateReleaseEligibility(
  readiness: FabricationReadiness,
): ReleaseEligibility {
  const blockers: ReleaseBlocker[] = []

  if (readiness.revisionStatus !== "accepted") {
    blockers.push({ code: "revision_not_accepted", values: { status: readiness.revisionStatus } })
  }
  if (readiness.lineTotal === 0 || readiness.lineChecked < readiness.lineTotal) {
    blockers.push({ code: "material_incomplete", values: { checked: readiness.lineChecked, total: readiness.lineTotal } })
  }
  if (readiness.weldComplete < readiness.weldTotal) {
    blockers.push({ code: "welding_incomplete", values: { complete: readiness.weldComplete, total: readiness.weldTotal } })
  }
  if (readiness.supportRecorded < readiness.supportTotal) {
    blockers.push({ code: "supports_incomplete", values: { recorded: readiness.supportRecorded, total: readiness.supportTotal } })
  }
  if (readiness.ndePending > 0) {
    blockers.push({ code: "nde_open", values: { count: readiness.ndePending } })
  }
  if (readiness.pwhtPending > 0) {
    blockers.push({ code: "pwht_open", values: { count: readiness.pwhtPending } })
  }

  const isFabricated =
    readiness.revisionStatus === "accepted" &&
    readiness.lineTotal > 0 &&
    readiness.lineChecked >= readiness.lineTotal &&
    readiness.weldComplete >= readiness.weldTotal &&
    readiness.supportRecorded >= readiness.supportTotal

  return { isFabricated, isReleasable: blockers.length === 0, blockers }
}
