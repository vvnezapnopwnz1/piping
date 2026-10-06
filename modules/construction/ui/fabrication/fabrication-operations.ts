import { CONSTRUCTION_STAGES, isDerivedStage, type ConstructionStage, type StageDates } from "../../domain/construction-phase"

export type FabricationOperationId = "material" | "welds" | "release" | "paint" | "laydown"

export interface FabricationOperation {
  id: FabricationOperationId
  title: string
  /** The route that records this operation; it opens the workbench on it. */
  href: string
  /** The spool's stages this operation records, in timeline order. */
  stages: readonly ConstructionStage[]
}

/**
 * The spool's eight shop stages (`CONSTRUCTION_STAGES`, dossier 16.2) grouped by the screen that
 * records them. Every stage belongs to exactly one operation and the order is the timeline's,
 * so the workbench's stepper is the spool timeline itself, not a second numbering of it.
 */
export const FABRICATION_OPERATIONS: readonly FabricationOperation[] = [
  { id: "material", title: "Material", href: "/fabrication/material-check", stages: ["start_fab", "material_check"] },
  // Fabricated is never recorded by hand: it is derived once the shop welds are complete.
  { id: "welds", title: "Shop welds", href: "/fabrication/weld-progress", stages: ["fabricated"] },
  // QC Release carries the NDE and PWHT gates; PWHT results are entered here.
  { id: "release", title: "QC release", href: "/fabrication/qc-release", stages: ["qc_release"] },
  { id: "paint", title: "Paint", href: "/fabrication/paint", stages: ["sent_to_paint", "painted", "final_qc"] },
  { id: "laydown", title: "Laydown", href: "/fabrication/laydown", stages: ["laydown"] },
]

const isOperation = (value: string | null): value is FabricationOperationId =>
  FABRICATION_OPERATIONS.some((operation) => operation.id === value)

/**
 * The operation an address opens: `?op=` when the drawer switched steps on the workbench page,
 * otherwise the operation route itself. `/fabrication/pwht-release` is QC release.
 */
export function operationForPath(pathname: string, op: string | null = null): FabricationOperationId | null {
  if (isOperation(op)) return op
  if (pathname === "/fabrication/pwht-release") return "release"
  return FABRICATION_OPERATIONS.find((operation) => operation.href === pathname)?.id ?? null
}

/** The first stage without a date: what this spool needs next. Null once Laydown is recorded. */
export function nextStage(dates: StageDates): ConstructionStage | null {
  return CONSTRUCTION_STAGES.find((stage) => !dates[stage]) ?? null
}

/** The operation that records the spool's next stage, or Laydown once everything is recorded. */
export function nextOperation(dates: StageDates): FabricationOperationId {
  const stage = nextStage(dates)
  if (!stage) return "laydown"
  return FABRICATION_OPERATIONS.find((operation) => operation.stages.includes(stage))!.id
}

export type OperationState = "done" | "next" | "later"

export function operationState(operation: FabricationOperation, dates: StageDates): OperationState {
  if (operation.stages.every((stage) => Boolean(dates[stage]))) return "done"
  const stage = nextStage(dates)
  return stage && operation.stages.includes(stage) ? "next" : "later"
}

export { isDerivedStage }
