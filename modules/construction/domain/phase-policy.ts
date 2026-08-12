import type { ConstructionPhase } from "./construction-phase"
import { CONSTRUCTION_STAGES, type ConstructionStage } from "./construction-phase"
import { ERECTION_STAGES, type ErectionStage, isRecordableErectionStage } from "./erection-stage"

export type PolicyStage = ConstructionStage | ErectionStage

export const PHASE_STAGE_POLICY: Readonly<Record<ConstructionPhase, readonly PolicyStage[]>> = {
  fabrication: CONSTRUCTION_STAGES,
  assembly: [],
  erection: ERECTION_STAGES,
}

export function stageBelongsToPhase(phase: ConstructionPhase, stage: PolicyStage): boolean {
  return PHASE_STAGE_POLICY[phase].includes(stage)
}

export function isRecordableForPhase(phase: ConstructionPhase, stage: PolicyStage): boolean {
  if (!stageBelongsToPhase(phase, stage)) return false
  if (phase === "erection") return isRecordableErectionStage(stage as ErectionStage)
  return phase === "fabrication" && (stage === "start_fab" || stage === "sent_to_paint")
}

export function constructionPhaseForWeldLocation(
  location: string | null | undefined,
): ConstructionPhase | null {
  if (location === "shop") return "fabrication"
  if (location === "field") return "erection"
  return null
}
