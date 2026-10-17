import type { Database } from "@/lib/supabase/database.types"

export type PackWorkflowRow = Database["public"]["Views"]["test_pack_workflow"]["Row"]

export type StepId =
  | "composition"
  | "readiness"
  | "line_check"
  | "item_clearance"
  | "blinding"
  | "testing"
  | "y_reinstatement"
  | "precommissioning"
  | "z_reinstatement"
export type StepState = "done" | "ready" | "ongoing" | "blocked"

export interface StepText {
  key: string
  values?: Record<string, string | number>
}
export interface PackStep {
  id: StepId
  state: StepState
  summary: StepText | null
  reasons: StepText[]
}

/** The order the readiness counters are shown in; the server owns the counts. */
const RFT_REASONS: readonly (readonly [string, string])[] = [
  ["NO_SPOOLS", "steps.reason.noSpools"],
  ["WELD_OR_SUPPORT_PENDING", "steps.reason.weldOrSupportPending"],
  ["FLANGE_PENDING", "steps.reason.flangePending"],
  ["NDE_PENDING", "steps.reason.ndePending"],
  ["PWHT_PENDING", "steps.reason.pwhtPending"],
  ["LINE_CHECK_PENDING", "steps.reason.lineCheckPending"],
  ["X_OPEN", "steps.reason.xOpen"],
]
const WAIT_REASONS: Record<string, string> = {
  rft_pending: "steps.wait.rft",
  blinding_pending: "steps.wait.blinding",
  testing_pending: "steps.wait.testing",
  y_reinstatement_pending: "steps.wait.yReinstatement",
  precommissioning_pending: "steps.wait.precommissioning",
}

const count = (row: PackWorkflowRow, column: string): number => Number((row as Record<string, unknown>)[column] ?? 0)
const text = (row: PackWorkflowRow, column: string): string | null => {
  const value = (row as Record<string, unknown>)[column]
  return typeof value === "string" && value !== "" ? value : null
}
const stepState = (value: string | null | undefined): StepState =>
  value === "completed" ? "done" : value === "ready" ? "ready" : value === "ongoing" ? "ongoing" : "blocked"

function waits(row: PackWorkflowRow, stage: string): StepText[] {
  const blockers = (row.blockers ?? {}) as Record<string, unknown>
  const codes = Array.isArray(blockers[stage]) ? (blockers[stage] as string[]) : []
  return codes.map((code) => ({ key: WAIT_REASONS[code] ?? "steps.wait.previous" }))
}

/** The readiness counters of a pack or of one isometric as reason lines, in a fixed order, zeros skipped. */
export function rftReasonLines(counts: Record<string, unknown> | null | undefined): StepText[] {
  const source = counts ?? {}
  return RFT_REASONS.filter(([code]) => Number(source[code] ?? 0) > 0).map(([code, key]) => ({ key, values: { count: Number(source[code]) } }))
}

export function buildPackSteps(row: PackWorkflowRow): PackStep[] {
  const rftReasons = rftReasonLines(((row.blockers ?? {}) as Record<string, unknown>).rft as Record<string, unknown> | undefined)
  const lineTotal = count(row, "line_check_total")
  const lineDone = count(row, "line_check_completed")
  const clearTotal = count(row, "item_clearance_total")
  const clearDone = count(row, "item_clearance_cleared")

  const steps: (PackStep | null)[] = [
    { id: "composition", state: "done", summary: null, reasons: [] },
    {
      id: "readiness",
      state: stepState(row.rft_state),
      summary: row.rft_state === "completed" ? { key: "steps.summary.readySince", values: { date: text(row, "rft_on") ?? "" } } : null,
      reasons: rftReasons,
    },
    {
      id: "line_check",
      state: lineTotal === 0 ? "ready" : lineDone === lineTotal ? "done" : "ongoing",
      summary: lineTotal === 0 ? { key: "steps.summary.notAssigned" } : { key: "steps.summary.isoProgress", values: { done: lineDone, total: lineTotal } },
      reasons: [],
    },
    clearTotal === 0
      ? null
      : {
          id: "item_clearance",
          state: clearDone === clearTotal ? "done" : "ongoing",
          summary: { key: "steps.summary.punchProgress", values: { done: clearDone, total: clearTotal } },
          reasons: [],
        },
    {
      id: "blinding",
      state: stepState(row.blinding_state),
      summary: row.blinding_completed ? { key: "steps.summary.doneOn", values: { date: text(row, "blinding_completed_on") ?? "" } } : null,
      reasons: waits(row, "blinding"),
    },
    {
      id: "testing",
      state: stepState(row.testing_state),
      summary: row.testing_completed
        ? { key: "steps.summary.doneOn", values: { date: text(row, "testing_completed_on") ?? "" } }
        : row.testing_started
          ? { key: "steps.summary.startedOn", values: { date: text(row, "testing_started_on") ?? "" } }
          : null,
      reasons: waits(row, "testing"),
    },
    row.y_state === "not_applicable"
      ? null
      : {
          id: "y_reinstatement",
          state: stepState(row.y_state),
          summary: { key: "steps.summary.jointProgress", values: { done: count(row, "y_completed_count"), total: count(row, "y_target_count") } },
          reasons: waits(row, "y_reinstatement"),
        },
    {
      id: "precommissioning",
      state: stepState(row.precomm_state),
      summary: row.precommissioned ? { key: "steps.summary.doneOn", values: { date: text(row, "precommissioning_completed_on") ?? "" } } : null,
      reasons: waits(row, "precommissioning"),
    },
    row.z_state === "not_applicable"
      ? null
      : {
          id: "z_reinstatement",
          state: stepState(row.z_state),
          summary: { key: "steps.summary.jointProgress", values: { done: count(row, "z_completed_count"), total: count(row, "z_target_count") } },
          reasons: waits(row, "z_reinstatement"),
        },
  ]
  return steps.filter((step): step is PackStep => step !== null)
}

/** The first step that is not finished: what the pack needs next. */
export function currentStepId(steps: readonly PackStep[]): StepId | null {
  return steps.find((step) => step.state !== "done")?.id ?? null
}

export function packStageGroup(canonicalState: string): "waiting" | "active" | "done" {
  return canonicalState === "awaiting_rft" ? "waiting" : canonicalState === "complete" ? "done" : "active"
}
