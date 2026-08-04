export const ERECTION_STAGES = [
  "to_site",
  "erected",
  "welded_bolted",
  "supported",
  "rft",
] as const

export type ErectionStage = (typeof ERECTION_STAGES)[number]

const LABELS: Record<ErectionStage, string> = {
  to_site: "To Site",
  erected: "Erected",
  welded_bolted: "Welded / Bolted",
  supported: "Supported",
  rft: "Ready for Test",
}

const RECORDABLE: readonly ErectionStage[] = ["to_site", "erected", "welded_bolted", "supported"]

export type ErectionStageDates = Partial<Record<ErectionStage, string | null>>

export function erectionStageLabel(stage: ErectionStage): string {
  return LABELS[stage]
}

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
