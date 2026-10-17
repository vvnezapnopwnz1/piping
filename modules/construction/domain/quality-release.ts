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
  isFabricated: boolean
  isReleasable: boolean
  releaseBlockers: ReleaseBlocker[]
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
 * Dossier 16.6 and 16.7. The server is the authoritative source for readiness and release blockers.
 * Returns the server-computed eligibility and blockers directly without client re-derivation.
 */
export function evaluateReleaseEligibility(
  readiness: FabricationReadiness,
): ReleaseEligibility {
  return {
    isFabricated: readiness.isFabricated,
    isReleasable: readiness.isReleasable,
    blockers: readiness.releaseBlockers,
  }
}
