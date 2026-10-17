import type { TestPackWorkflowRow } from "../infrastructure/supabase-pressure-test-repository"

import type {
  PressureTestState,
  PressureTestWorkflowFacts,
} from "../domain/pressure-test-workflow"
import type { TestPackOperation } from "./test-pack-workspace-model"


export type StagePresentationState =
  | "not_applicable"
  | "ready"
  | "ongoing"
  | "completed"
  | "blocked"
  | "unknown"

export interface WorkflowPresentationSummary {
  rftState: StagePresentationState
  blindingState: StagePresentationState
  testingState: StagePresentationState
  yState: StagePresentationState
  precommState: StagePresentationState
  zState: StagePresentationState
  lineCheckSummary: { total: number; completed: number; open: number }
  itemClearanceSummary: { total: number; cleared: number; open: number }
  canonicalState: PressureTestState
  facts: PressureTestWorkflowFacts
  blockers?: Record<string, unknown>
  availableOperations?: string[]
}

export function summarizeWorkflowPresentation({
  workflowRow,
}: {
  workflowRow: TestPackWorkflowRow
}): WorkflowPresentationSummary {
  if (!workflowRow) {
    throw new Error("workflowRow is required")
  }

  const yEligible = workflowRow.y_target_count > 0
  const yReinstated = yEligible && workflowRow.y_completed_count >= workflowRow.y_target_count
  const zEligible = workflowRow.z_target_count > 0
  const zReinstated = zEligible && workflowRow.z_completed_count >= workflowRow.z_target_count

  const facts: PressureTestWorkflowFacts = {
    canonicalState: workflowRow.canonical_state as PressureTestState,
    isRft: workflowRow.is_rft,
    blindingAssigned: workflowRow.blinding_assigned ?? false,
    blindingCompleted: workflowRow.blinding_completed ?? false,
    testingStarted: workflowRow.testing_started ?? false,
    testingCompleted: workflowRow.testing_completed ?? false,
    yEligible,
    yReinstated,
    precommissioned: workflowRow.precommissioned ?? false,
    zEligible,
    zReinstated,
  }

  return {
    rftState: workflowRow.rft_state as StagePresentationState,
    blindingState: workflowRow.blinding_state as StagePresentationState,
    testingState: workflowRow.testing_state as StagePresentationState,
    yState: workflowRow.y_state as StagePresentationState,
    precommState: workflowRow.precomm_state as StagePresentationState,
    zState: workflowRow.z_state as StagePresentationState,
    lineCheckSummary: {
      total: workflowRow.line_check_total,
      completed: workflowRow.line_check_completed,
      open: Math.max(0, workflowRow.line_check_total - workflowRow.line_check_completed),
    },
    itemClearanceSummary: {
      total: workflowRow.item_clearance_total,
      cleared: workflowRow.item_clearance_cleared,
      open: Math.max(0, workflowRow.item_clearance_total - workflowRow.item_clearance_cleared),
    },
    canonicalState: workflowRow.canonical_state as PressureTestState,
    facts,
    blockers: (workflowRow.blockers ?? {}) as Record<string, unknown>,
    availableOperations: workflowRow.available_operations,
  }
}

export type WorkflowOperationName =
  | "blinding"
  | "testing"
  | "testing_start"
  | "testing_complete"
  | "y_reinstatement"
  | "precommissioning"
  | "z_reinstatement"

export const WORKFLOW_OPERATION_MAP: Record<TestPackOperation, readonly WorkflowOperationName[]> = {
  line_check: [],
  item_clearance: [],
  blinding: ["blinding"],
  testing: ["testing", "testing_start", "testing_complete"],
  y_reinstatement: ["y_reinstatement"],
  precommissioning: ["precommissioning"],
  z_reinstatement: ["z_reinstatement"],
}

export function isWorkflowOperationAvailable(
  operation: TestPackOperation,
  availableOperations?: readonly string[] | null,
  specificAction?: "testing_start" | "testing_complete",
): boolean {
  if (operation === "line_check" || operation === "item_clearance") {
    return true
  }
  if (!availableOperations) return false
  if (specificAction) {
    return availableOperations.includes(specificAction)
  }
  const requiredOps = WORKFLOW_OPERATION_MAP[operation]
  return requiredOps.some((op) => availableOperations.includes(op))
}

export function canOpenWorkflowOperation(
  operation: TestPackOperation,
  canOperate: boolean,
  hasWorkflow: boolean,
  availableOperations?: readonly string[] | null,
): boolean {
  return (
    canOperate &&
    hasWorkflow &&
    isWorkflowOperationAvailable(operation, availableOperations)
  )
}

export function canOperateWorkflow(
  canManage: boolean,
  lifecycle: string,
  dataCurrent: boolean,
): { allowed: boolean; reason?: string } {
  if (!canManage) {
    return { allowed: false, reason: "text.insufficientPermissionsReaderAccess" }
  }
  if (lifecycle === "archived") {
    return { allowed: false, reason: "text.testPackIsArchivedAndReadOnly" }
  }
  if (!dataCurrent) {
    return { allowed: false, reason: "text.dataIsStaleRetryRefreshBeforeRecording" }
  }
  return { allowed: true }
}
