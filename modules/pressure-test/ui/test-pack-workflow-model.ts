import type {
  BlindingWorklistRow,
  FlangeJointReadinessRow,
  FlangeReinstatementRecordRow,
  LineCheckWorklistRow,
  ItemClearanceWorklistRow,
  TestingPrecommWorklistRow,
  TestPackMemberRow,
} from "../infrastructure/supabase-pressure-test-repository"
import {
  derivePressureTestState,
  type PressureTestState,
  type PressureTestWorkflowFacts,
} from "../domain/pressure-test-workflow"

export type StagePresentationState =
  | "not_applicable"
  | "ready"
  | "ongoing"
  | "completed"
  | "blocked"
  | "unknown"

export interface ReinstatementCategoryFacts {
  category: "Y" | "Z"
  requiredTargets: FlangeJointReadinessRow[]
  completedTargetIds: Set<string>
  state: StagePresentationState
}

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
}

export function filterActiveTestPackFlanges(
  members: readonly TestPackMemberRow[],
  flanges: readonly FlangeJointReadinessRow[],
  category: "Y" | "Z",
): FlangeJointReadinessRow[] {
  const memberIsoIds = new Set(
    members
      .filter((item) => item.removed_at === null && Boolean(item.isometric_id))
      .map((item) => item.isometric_id as string),
  )

  return flanges.filter((flange) => {
    if (!flange.isometric_id || !flange.flange_joint_revision_id) return false
    return (
      memberIsoIds.has(flange.isometric_id) &&
      flange.revision_status === "accepted" &&
      flange.is_removed === false &&
      flange.requires_reinstatement === true &&
      flange.category_code === category
    )
  })
}

export function computeEffectiveCompletedFlangeIds(
  targets: readonly FlangeJointReadinessRow[],
  records: readonly FlangeReinstatementRecordRow[],
): Set<string> {
  const targetIds = new Set(
    targets
      .map((t) => t.flange_joint_revision_id)
      .filter((id): id is string => Boolean(id)),
  )

  const completed = new Set<string>()
  for (const record of records) {
    if (
      record.superseded_at === null &&
      targetIds.has(record.flange_joint_revision_id)
    ) {
      completed.add(record.flange_joint_revision_id)
    }
  }
  return completed
}

export function deriveReinstatementCategoryFacts(
  category: "Y" | "Z",
  targets: readonly FlangeJointReadinessRow[] | null,
  records: readonly FlangeReinstatementRecordRow[] | null,
  isUnlocked: boolean,
): ReinstatementCategoryFacts {
  if (targets === null || records === null) {
    return {
      category,
      requiredTargets: [],
      completedTargetIds: new Set(),
      state: "unknown",
    }
  }

  const categoryTargets = targets.filter((t) => t.category_code === category)
  if (categoryTargets.length === 0) {
    return {
      category,
      requiredTargets: [],
      completedTargetIds: new Set(),
      state: "not_applicable",
    }
  }

  const completedTargetIds = computeEffectiveCompletedFlangeIds(categoryTargets, records)
  const isComplete = completedTargetIds.size >= categoryTargets.length

  let state: StagePresentationState
  if (isComplete) {
    state = "completed"
  } else if (!isUnlocked) {
    state = "blocked"
  } else if (completedTargetIds.size > 0) {
    state = "ongoing"
  } else {
    state = "ready"
  }

  return {
    category,
    requiredTargets: categoryTargets,
    completedTargetIds,
    state,
  }
}

export function summarizeWorkflowPresentation({
  isRft,
  blindingWorklist,
  testingPrecommWorklist,
  members,
  reinstatementTargets,
  effectiveRecords,
  lineCheckWorklist,
  itemClearanceWorklist,
}: {
  isRft: boolean
  blindingWorklist: readonly BlindingWorklistRow[]
  testingPrecommWorklist: readonly TestingPrecommWorklistRow[]
  members: readonly TestPackMemberRow[]
  reinstatementTargets: readonly FlangeJointReadinessRow[] | null
  effectiveRecords: readonly FlangeReinstatementRecordRow[] | null
  lineCheckWorklist: readonly LineCheckWorklistRow[]
  itemClearanceWorklist: readonly ItemClearanceWorklistRow[]
}): WorkflowPresentationSummary {
  // Blinding facts
  const blindingRow = blindingWorklist[0] ?? null
  const blindingAssigned = Boolean(blindingRow)
  const blindingCompleted = Boolean(blindingRow?.record_id)

  // Testing facts
  const testingRow = testingPrecommWorklist[0] ?? null
  const testingStarted = Boolean(testingRow?.testing_started_on)
  const testingCompleted = Boolean(testingRow?.testing_completed_on)

  // Reinstatement Y
  const yTargets =
    reinstatementTargets !== null
      ? filterActiveTestPackFlanges(members, reinstatementTargets, "Y")
      : null
  const yFacts = deriveReinstatementCategoryFacts(
    "Y",
    yTargets,
    effectiveRecords,
    testingCompleted,
  )

  const yEligible = yFacts.state !== "not_applicable"
  const yReinstated = yFacts.state === "completed"

  // Precomm facts
  const precommissioned = Boolean(testingRow?.precommissioning_completed_on)
  const precommUnlocked = testingCompleted && (!yEligible || yReinstated)

  // Reinstatement Z
  const zTargets =
    reinstatementTargets !== null
      ? filterActiveTestPackFlanges(members, reinstatementTargets, "Z")
      : null
  const zFacts = deriveReinstatementCategoryFacts(
    "Z",
    zTargets,
    effectiveRecords,
    precommissioned,
  )
  const zEligible = zFacts.state !== "not_applicable"
  const zReinstated = zFacts.state === "completed"

  // Canonical facts for domain state
  const facts: PressureTestWorkflowFacts = {
    isRft,
    blindingAssigned,
    blindingCompleted,
    testingStarted,
    testingCompleted,
    yEligible,
    yReinstated,
    precommissioned,
    zEligible,
    zReinstated,
  }

  const canonicalState = derivePressureTestState(facts)

  // Presentation states for steps
  const rftState: StagePresentationState = isRft ? "completed" : "blocked"

  let blindingState: StagePresentationState
  if (blindingCompleted) {
    blindingState = "completed"
  } else if (!isRft) {
    blindingState = "blocked"
  } else if (blindingAssigned) {
    blindingState = "ongoing"
  } else {
    blindingState = "ready"
  }

  let testingState: StagePresentationState
  if (testingCompleted) {
    testingState = "completed"
  } else if (!blindingCompleted) {
    testingState = "blocked"
  } else if (testingStarted) {
    testingState = "ongoing"
  } else {
    testingState = "ready"
  }

  let precommState: StagePresentationState
  if (precommissioned) {
    precommState = "completed"
  } else if (!precommUnlocked) {
    precommState = "blocked"
  } else {
    precommState = "ready"
  }

  // Preparatory summaries
  const lineCompleted = lineCheckWorklist.filter((row) => row.result_id !== null).length
  const clearanceCompleted = itemClearanceWorklist.filter((row) => row.clearance_id !== null).length

  return {
    rftState,
    blindingState,
    testingState,
    yState: yFacts.state,
    precommState,
    zState: zFacts.state,
    lineCheckSummary: {
      total: lineCheckWorklist.length,
      completed: lineCompleted,
      open: lineCheckWorklist.length - lineCompleted,
    },
    itemClearanceSummary: {
      total: itemClearanceWorklist.length,
      cleared: clearanceCompleted,
      open: itemClearanceWorklist.length - clearanceCompleted,
    },
    canonicalState,
    facts,
  }
}

export function canOperateWorkflow(
  canManage: boolean,
  lifecycle: string,
  dataCurrent: boolean,
): { allowed: boolean; reason?: string } {
  if (!canManage) {
    return { allowed: false, reason: "Insufficient permissions (Reader access)" }
  }
  if (lifecycle === "archived") {
    return { allowed: false, reason: "Test Pack is archived and read-only" }
  }
  if (!dataCurrent) {
    return { allowed: false, reason: "Data is stale; retry refresh before recording" }
  }
  return { allowed: true }
}
