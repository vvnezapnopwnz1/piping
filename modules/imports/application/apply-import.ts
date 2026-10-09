import { canApply, isTerminalStatus, type ApplyGate } from "../domain/import-job"

/** Why an import cannot be applied yet, as a code the UI turns into a sentence. */
export type ApplyGateReason =
  | { code: "alreadyApplied" }
  | { code: "closed" }
  | { code: "notValidated" }
  | { code: "blockers"; count: number }
  | { code: "conflictsUnconfirmed"; count: number }

export interface ApplyGateDescription {
  allowed: boolean
  requiresConfirmation: boolean
  reason: ApplyGateReason | null
}

export function describeApplyGate(gate: ApplyGate): ApplyGateDescription {
  if (gate.status === "applied") {
    return { allowed: false, requiresConfirmation: false, reason: { code: "alreadyApplied" } }
  }

  if (isTerminalStatus(gate.status)) {
    return { allowed: false, requiresConfirmation: false, reason: { code: "closed" } }
  }

  if (gate.status !== "validated") {
    return { allowed: false, requiresConfirmation: false, reason: { code: "notValidated" } }
  }

  if (gate.blockerCount > 0) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: { code: "blockers", count: gate.blockerCount },
    }
  }

  if (gate.conflictCount > 0 && !gate.conflictsConfirmed) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: { code: "conflictsUnconfirmed", count: gate.conflictCount },
    }
  }

  return {
    allowed: canApply(gate),
    requiresConfirmation: false,
    reason: null,
  }
}
