"use client"

import { useMemo } from "react"
import { useSpoolReadiness } from "@/store/welds-store"
import { useSpoolsStore } from "@/store/spools-store"
import { deriveFabStage, STAGE_ORDER, type SpoolFabStage, type MaterialCheckRecord } from "@/lib/spool-data"

export function useSpoolStages(): Map<string, SpoolFabStage> {
  const readiness = useSpoolReadiness()
  const records = useSpoolsStore((s) => s.records)
  return useMemo(() => {
    const recordMap = new Map<string, MaterialCheckRecord>(records.map((r) => [r.spoolNo, r]))
    const map = new Map<string, SpoolFabStage>()
    for (const r of readiness) {
      const mcRecord = recordMap.get(r.spoolNo)
      map.set(r.spoolNo, deriveFabStage(r, mcRecord))
    }
    // Defensive: spools with MC records but no welds yet
    for (const rec of records) {
      if (!map.has(rec.spoolNo)) {
        map.set(rec.spoolNo, deriveFabStage(undefined, rec))
      }
    }
    return map
  }, [readiness, records])
}

export function useSpoolStageCounts(): Record<SpoolFabStage, number> {
  const stages = useSpoolStages()
  return useMemo(() => {
    const counts = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])) as Record<SpoolFabStage, number>
    for (const s of stages.values()) counts[s]++
    return counts
  }, [stages])
}

export function useSpoolsAtStage(stage: SpoolFabStage): string[] {
  const stages = useSpoolStages()
  return useMemo(
    () => [...stages.entries()].filter(([, s]) => s === stage).map(([no]) => no).sort(),
    [stages, stage]
  )
}

export function useSpoolMCRecord(spoolNo: string): MaterialCheckRecord | undefined {
  return useSpoolsStore((s) => s.getRecord(spoolNo))
}
