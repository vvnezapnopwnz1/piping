export const CONSTRUCTION_PHASES = ["fabrication", "assembly", "erection"] as const
export type ConstructionPhase = (typeof CONSTRUCTION_PHASES)[number]

/** Dossier 16.2, in order. The ordinal of a stage is its index plus one. */
export const CONSTRUCTION_STAGES = [
  "start_fab",
  "material_check",
  "fabricated",
  "qc_release",
  "sent_to_paint",
  "painted",
  "final_qc",
  "laydown",
] as const
export type ConstructionStage = (typeof CONSTRUCTION_STAGES)[number]

const STAGE_LABELS: Record<ConstructionStage, string> = {
  start_fab: "Start Fab",
  material_check: "Material Check",
  fabricated: "Fabricated",
  qc_release: "QC Release",
  sent_to_paint: "Sent to Paint",
  painted: "Painted",
  final_qc: "Final QC",
  laydown: "Laydown",
}

/**
 * Stages a user records directly. Everything else is written by the command that owns the
 * evidence, and `fabricated` is never written at all — see plan section 3.3.
 */
const RECORDABLE_STAGES: readonly ConstructionStage[] = ["start_fab", "sent_to_paint"]

/** Stages with no row anywhere: computed from the definition graph and the ledger. */
export const DERIVED_STAGES: readonly ConstructionStage[] = ["fabricated"]

export type StageDates = Partial<Record<ConstructionStage, string | null>>

export function stageLabel(stage: ConstructionStage): string {
  return STAGE_LABELS[stage]
}

export function stageOrdinal(stage: ConstructionStage): number {
  return CONSTRUCTION_STAGES.indexOf(stage) + 1
}

export function isRecordableStage(stage: ConstructionStage): boolean {
  return RECORDABLE_STAGES.includes(stage)
}

export function isDerivedStage(stage: ConstructionStage): boolean {
  return DERIVED_STAGES.includes(stage)
}

export function predecessorOf(stage: ConstructionStage): ConstructionStage | null {
  const index = CONSTRUCTION_STAGES.indexOf(stage)
  return index <= 0 ? null : CONSTRUCTION_STAGES[index - 1]
}

/**
 * The furthest stage the spool has reached. `isFabricated` is passed in rather than derived
 * from dates because it comes from `spool_fabrication_readiness`, not from the ledger.
 */
export function currentStage(
  dates: StageDates,
  isFabricated: boolean,
): ConstructionStage | null {
  for (let index = CONSTRUCTION_STAGES.length - 1; index >= 0; index -= 1) {
    const stage = CONSTRUCTION_STAGES[index]
    if (stage === "fabricated") {
      if (isFabricated) return stage
      continue
    }
    if (dates[stage]) return stage
  }
  return null
}
