export type PressureTestState =
  | "awaiting_rft"
  | "blinding_assigned"
  | "blinded"
  | "testing"
  | "tested"
  | "awaiting_y_reinstatement"
  | "ready_for_precommissioning"
  | "precommissioned"
  | "awaiting_z_reinstatement"
  | "complete"

export interface PressureTestWorkflowFacts {
  canonicalState: PressureTestState
  isRft?: boolean
  blindingAssigned?: boolean
  blindingCompleted?: boolean
  testingStarted?: boolean
  testingCompleted?: boolean
  yEligible?: boolean
  yReinstated?: boolean
  precommissioned?: boolean
  zEligible?: boolean
  zReinstated?: boolean
}
export type PressureTestEvent = "testing_started" | "testing_completed" | "precommissioning_completed"

/**
 * Returns the server-computed canonical state directly without client ladder calculation.
 */
export function derivePressureTestState(
  facts: PressureTestWorkflowFacts,
): PressureTestState {
  return facts.canonicalState
}


export function canRecordPressureTestEvent(state: PressureTestState, event: PressureTestEvent): boolean {
  if (event === "testing_started") return state === "blinded"
  if (event === "testing_completed") return state === "testing"
  return state === "ready_for_precommissioning"
}

export function isMonotonicDate(previous: string | null, next: string): boolean {
  return previous === null || next >= previous
}
