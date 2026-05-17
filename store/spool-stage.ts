"use client"

import { useMemo } from "react"
import { useSpoolReadiness } from "@/store/welds-store"
import { useSpoolsStore } from "@/store/spools-store"
import { useQCReleaseStore } from "@/store/qc-release-store"
import { deriveFabStage, STAGE_ORDER, type SpoolFabStage, type MaterialCheckRecord, type QCReleaseRecord } from "@/lib/spool-data"

export function useSpoolStages(): Map<string, SpoolFabStage> {
  const readiness = useSpoolReadiness()
  const mcRecords = useSpoolsStore((s) => s.records)
  const qcRecords = useQCReleaseStore((s) => s.records)

  return useMemo(() => {
    const mcMap = new Map<string, MaterialCheckRecord>(mcRecords.map((r) => [r.spoolNo, r]))
    const qcMap = new Map<string, QCReleaseRecord>(qcRecords.map((r) => [r.spoolNo, r]))
    const map = new Map<string, SpoolFabStage>()

    for (const r of readiness) {
      map.set(r.spoolNo, deriveFabStage(r, mcMap.get(r.spoolNo), qcMap.get(r.spoolNo)))
    }
    // Defensive: spools with MC records but no welds yet
    for (const rec of mcRecords) {
      if (!map.has(rec.spoolNo)) {
        map.set(rec.spoolNo, deriveFabStage(undefined, rec, qcMap.get(rec.spoolNo)))
      }
    }
    return map
  }, [readiness, mcRecords, qcRecords])
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

export function useQCReleaseRecord(spoolNo: string): QCReleaseRecord | undefined {
  return useQCReleaseStore((s) => s.getRecord(spoolNo))
}
