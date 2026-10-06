import type { TraceEntry } from "../domain/material-check"

export interface MaterialDraftChoice extends TraceEntry {
  traceNumber: string
  mrrNumber: string
}

export type MaterialDrafts = Record<string, MaterialDraftChoice>

export function clearSavedMaterialDrafts(
  current: MaterialDrafts,
  submitted: readonly TraceEntry[],
): MaterialDrafts {
  const next = { ...current }
  for (const sent of submitted) {
    const value = next[sent.spoolRevisionMaterialId]
    if (
      value &&
      value.pipingMaterialRecordId === sent.pipingMaterialRecordId
    ) {
      delete next[sent.spoolRevisionMaterialId]
    }
  }
  return next
}

export function createMaterialRequestOwner() {
  let generation = 0
  return {
    begin: () => ++generation,
    invalidate: () => {
      generation += 1
    },
    isCurrent: (token: number) => token === generation,
  }
}
