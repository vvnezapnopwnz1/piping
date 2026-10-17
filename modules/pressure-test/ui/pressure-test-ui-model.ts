import type { PressureTestWorkflowFacts } from "../domain/pressure-test-workflow"

export const pressureTestRequestTypes = ["line_check", "item_clearance", "blinding", "reinstatement"] as const
export type PressureTestRequestType = (typeof pressureTestRequestTypes)[number]

export interface PressureTestRequestConfig {
  title: string
  description: string
  teamType: "line_check" | "finishing" | "blinding" | "reinstatement"
  targetLabel: string
  worklist: "line_check_worklist" | "item_clearance_worklist" | "blinding_worklist" | "reinstatement_worklist"
  printPath: string
}

const configs: Record<PressureTestRequestType, PressureTestRequestConfig> = {
  line_check: { title: "text.lineCheck", description: "text.assignAnIsoTeamAndRecordTheLine", teamType: "line_check", targetLabel: "ISO", worklist: "line_check_worklist", printPath: "/testpack/print/line-check/{requestId}" },
  item_clearance: { title: "text.itemClearance", description: "text.assignOpenCategoryXPunchItemsToFinishing", teamType: "finishing", targetLabel: "text.punchItem", worklist: "item_clearance_worklist", printPath: "/testpack/print/item-clearance/{requestId}" },
  blinding: { title: "text.blinding", description: "text.assignTheRftTestPackToABlinding", teamType: "blinding", targetLabel: "text.testPack", worklist: "blinding_worklist", printPath: "/testpack/print/blinding/{requestId}" },
  reinstatement: { title: "text.reinstatement", description: "text.assignEligibleYZFlangeJointsAndRecord", teamType: "reinstatement", targetLabel: "text.flangeJoint", worklist: "reinstatement_worklist", printPath: "/testpack/print/reinstatement/{requestId}" },
}

export function getPressureTestRequestConfig(type: PressureTestRequestType): PressureTestRequestConfig {
  return configs[type]
}

export type WorkflowTone = "blocked" | "ready" | "ongoing" | "complete"
export interface WorkflowSummary { label: string; tone: WorkflowTone; code?: 12 }

export function summarizeWorkflow(facts: PressureTestWorkflowFacts): WorkflowSummary {
  switch (facts.canonicalState) {
    case "awaiting_rft":
      return { label: "text.awaitingRft", tone: "blocked" }
    case "blinding_assigned":
      return facts.blindingCompleted
        ? { label: "text.blindingOngoing", tone: "ongoing" }
        : { label: "text.readyForBlinding", tone: "ready", code: 12 }
    case "blinded":
      return { label: "text.readyToStartTesting", tone: "ready", code: 12 }
    case "testing":
      return { label: "text.testingOngoing", tone: "ongoing" }
    case "tested":
    case "awaiting_y_reinstatement":
      return { label: "text.awaitingYReinstatement", tone: "blocked" }
    case "ready_for_precommissioning":
      return { label: "text.readyForPreCommissioning", tone: "ready" }
    case "precommissioned":
    case "awaiting_z_reinstatement":
      return { label: "text.awaitingZReinstatement", tone: "blocked" }
    case "complete":
      return { label: "text.complete", tone: "complete" }
    default:
      return { label: "text.awaitingRft", tone: "blocked" }
  }
}
