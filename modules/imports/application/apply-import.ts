import { canApply, isTerminalStatus, type ApplyGate } from "../domain/import-job"

export interface ApplyGateDescription {
  allowed: boolean
  requiresConfirmation: boolean
  reason: string | null
}

export function describeApplyGate(gate: ApplyGate): ApplyGateDescription {
  if (gate.status === "applied") {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: "This import has already been applied.",
    }
  }

  if (isTerminalStatus(gate.status)) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: "This import is closed and can no longer be applied.",
    }
  }

  if (gate.status !== "validated") {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: "Upload and validate the file before applying it.",
    }
  }

  if (gate.blockerCount > 0) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: `${gate.blockerCount} rows have blocking errors that must be fixed in the source file.`,
    }
  }

  if (gate.conflictCount > 0 && !gate.conflictsConfirmed) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: `${gate.conflictCount} rows overwrite existing records. Confirm the overwrite to continue.`,
    }
  }

  return {
    allowed: canApply(gate),
    requiresConfirmation: false,
    reason: null,
  }
}
