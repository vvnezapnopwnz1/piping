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
  line_check: { title: "Line Check", description: "Assign an ISO team and record the line-check result with optional Category X punches.", teamType: "line_check", targetLabel: "ISO", worklist: "line_check_worklist", printPath: "/testpack/print/line-check/{requestId}" },
  item_clearance: { title: "Item Clearance", description: "Assign open Category X punch items to finishing and record their clearance.", teamType: "finishing", targetLabel: "Punch item", worklist: "item_clearance_worklist", printPath: "/testpack/print/item-clearance/{requestId}" },
  blinding: { title: "Blinding", description: "Assign the RFT Test Pack to a blinding team and record completion.", teamType: "blinding", targetLabel: "Test Pack", worklist: "blinding_worklist", printPath: "/testpack/print/blinding/{requestId}" },
  reinstatement: { title: "Reinstatement", description: "Assign eligible Y/Z flange joints and record each joint result.", teamType: "reinstatement", targetLabel: "Flange joint", worklist: "reinstatement_worklist", printPath: "/testpack/print/reinstatement/{requestId}" },
}

export function getPressureTestRequestConfig(type: PressureTestRequestType): PressureTestRequestConfig {
  return configs[type]
}

export type WorkflowTone = "blocked" | "ready" | "ongoing" | "complete"
export interface WorkflowSummary { label: string; tone: WorkflowTone; code?: 12 }

export function summarizeWorkflow(facts: PressureTestWorkflowFacts): WorkflowSummary {
  if (!facts.isRft) return { label: "Awaiting RFT", tone: "blocked" }
  if (!facts.blindingAssigned) return { label: "Ready for blinding", tone: "ready", code: 12 }
  if (!facts.blindingCompleted) return { label: "Blinding ongoing", tone: "ongoing" }
  if (!facts.testingStarted) return { label: "Ready to start testing", tone: "ready", code: 12 }
  if (!facts.testingCompleted) return { label: "Testing ongoing", tone: "ongoing" }
  if (facts.yEligible && !facts.yReinstated) return { label: "Awaiting Y reinstatement", tone: "blocked" }
  if (!facts.precommissioned) return { label: "Ready for pre-commissioning", tone: "ready" }
  if (facts.zEligible && !facts.zReinstated) return { label: "Awaiting Z reinstatement", tone: "blocked" }
  return { label: "Complete", tone: "complete" }
}
