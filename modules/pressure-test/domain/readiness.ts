export type ReadinessBlockerCode =
  | "NO_CURRENT_REVISION"
  | "NO_SPOOLS"
  | "WELD_OR_SUPPORT_PENDING"
  | "FLANGE_PENDING"
  | "NDE_PENDING"
  | "PWHT_PENDING"
  | "LINE_CHECK_PENDING"
  | "X_OPEN"

export interface IsometricReadinessFacts {
  hasCurrentRevision: boolean
  spoolTotal: number
  spoolComplete: number
  weldTotal: number
  weldComplete: number
  supportTotal: number
  supportComplete: number
  flangeTotal: number
  flangeComplete: number
  ndePending: number
  pwhtPending: number
  lineCheckAssigned: boolean
  lineCheckCompleted: boolean
  openXPunches: number
  qcReleased: boolean
}
export interface IsometricReadiness {
  blockers: ReadinessBlockerCode[]
  blockerCounts: Record<ReadinessBlockerCode, number>
  isComplete: boolean
  isQcReleased: boolean
  isRft: boolean
}

const EMPTY_COUNTS: Record<ReadinessBlockerCode, number> = {
  NO_CURRENT_REVISION: 0,
  NO_SPOOLS: 0,
  WELD_OR_SUPPORT_PENDING: 0,
  FLANGE_PENDING: 0,
  NDE_PENDING: 0,
  PWHT_PENDING: 0,
  LINE_CHECK_PENDING: 0,
  X_OPEN: 0,
}

export function deriveIsometricReadiness(facts: IsometricReadinessFacts): IsometricReadiness {
  const blockerCounts = { ...EMPTY_COUNTS }
  const blockers: ReadinessBlockerCode[] = []
  const add = (code: ReadinessBlockerCode, count = 1) => {
    blockerCounts[code] = count
    if (count > 0) blockers.push(code)
  }

  if (!facts.hasCurrentRevision) add("NO_CURRENT_REVISION")
  if (facts.spoolTotal === 0) add("NO_SPOOLS")
  add("WELD_OR_SUPPORT_PENDING", Math.max(facts.weldTotal - facts.weldComplete, 0) + Math.max(facts.supportTotal - facts.supportComplete, 0))
  add("FLANGE_PENDING", Math.max(facts.flangeTotal - facts.flangeComplete, 0))
  add("NDE_PENDING", facts.ndePending)
  add("PWHT_PENDING", facts.pwhtPending)
  add("LINE_CHECK_PENDING", facts.lineCheckAssigned && facts.lineCheckCompleted ? 0 : 1)
  add("X_OPEN", facts.openXPunches)

  const isComplete = blockers.length === 0
  const isQcReleased = isComplete && facts.qcReleased
  return { blockers, blockerCounts, isComplete, isQcReleased, isRft: isQcReleased }
}

export function deriveTestPackRft(memberReadiness: readonly IsometricReadiness[], lifecycle: "active" | "archived"): boolean {
  return lifecycle === "active" && memberReadiness.length > 0 && memberReadiness.every((member) => member.isRft)
}
