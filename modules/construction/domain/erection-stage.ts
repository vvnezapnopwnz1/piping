export const ERECTION_STAGES = [
  "to_site",
  "erected",
  "welded_bolted",
  "supported",
  "rft",
] as const

export type ErectionStage = (typeof ERECTION_STAGES)[number]

const RECORDABLE: readonly ErectionStage[] = ["to_site", "erected", "welded_bolted", "supported"]

export type ErectionStageDates = Partial<Record<ErectionStage, string | null>>

export function erectionStageOrdinal(stage: ErectionStage): number {
  return ERECTION_STAGES.indexOf(stage) + 1
}

export function isRecordableErectionStage(stage: ErectionStage): boolean {
  return RECORDABLE.includes(stage)
}

export function erectionStagePredecessor(stage: ErectionStage): ErectionStage | null {
  const index = ERECTION_STAGES.indexOf(stage)
  return index <= 0 ? null : ERECTION_STAGES[index - 1]
}
