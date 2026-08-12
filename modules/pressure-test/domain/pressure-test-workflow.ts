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
  isRft: boolean
  blindingAssigned: boolean
  blindingCompleted: boolean
  testingStarted: boolean
  testingCompleted: boolean
  yEligible: boolean
  yReinstated: boolean
  precommissioned: boolean
  zEligible: boolean
  zReinstated: boolean
}
export type PressureTestEvent = "testing_started" | "testing_completed" | "precommissioning_completed"

export function derivePressureTestState(facts: PressureTestWorkflowFacts): PressureTestState {
  if (!facts.isRft) return "awaiting_rft"
  if (!facts.blindingAssigned) return "blinding_assigned"
  if (!facts.blindingCompleted) return "blinding_assigned"
  if (!facts.testingStarted) return "blinded"
  if (!facts.testingCompleted) return "testing"
  if (facts.yEligible && !facts.yReinstated) return "awaiting_y_reinstatement"
  if (!facts.precommissioned) return "ready_for_precommissioning"
  if (facts.zEligible && !facts.zReinstated) return "awaiting_z_reinstatement"
  return "complete"
}

export function canRecordPressureTestEvent(state: PressureTestState, event: PressureTestEvent): boolean {
  if (event === "testing_started") return state === "blinded"
  if (event === "testing_completed") return state === "testing"
  return state === "ready_for_precommissioning"
}

export function isMonotonicDate(previous: string | null, next: string): boolean {
  return previous === null || next >= previous
}
