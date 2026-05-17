"use client"

import { useMemo } from "react"
import { useSpoolReadiness } from "@/store/welds-store"
import { useSpoolsStore } from "@/store/spools-store"
import { useQCReleaseStore } from "@/store/qc-release-store"
import { usePaintStore } from "@/store/paint-store"
import { useLaydownStore } from "@/store/laydown-store"
import { deriveFabStage, STAGE_ORDER, type SpoolFabStage, type MaterialCheckRecord, type QCReleaseRecord, type PaintRecord, type LaydownRecord } from "@/lib/spool-data"

export function useSpoolStages(): Map<string, SpoolFabStage> {
  const readiness = useSpoolReadiness()
  const mcRecords = useSpoolsStore((s) => s.records)
  const qcRecords = useQCReleaseStore((s) => s.records)
  const paintRecords = usePaintStore((s) => s.records)
  const laydownRecords = useLaydownStore((s) => s.records)

  return useMemo(() => {
    const mcMap = new Map<string, MaterialCheckRecord>(mcRecords.map((r) => [r.spoolNo, r]))
    const qcMap = new Map<string, QCReleaseRecord>(qcRecords.map((r) => [r.spoolNo, r]))
    const paintMap = new Map<string, PaintRecord>(paintRecords.map((r) => [r.spoolNo, r]))
    const laydownMap = new Map<string, LaydownRecord>(laydownRecords.map((r) => [r.spoolNo, r]))
    const map = new Map<string, SpoolFabStage>()

    for (const r of readiness) {
      map.set(
        r.spoolNo,
        deriveFabStage(
          r,
          mcMap.get(r.spoolNo),
          qcMap.get(r.spoolNo),
          paintMap.get(r.spoolNo),
          laydownMap.get(r.spoolNo),
        ),
      )
    }
    // Defensive: spools with MC records but no welds yet
    for (const rec of mcRecords) {
      if (!map.has(rec.spoolNo)) {
        map.set(
          rec.spoolNo,
          deriveFabStage(
            undefined,
            rec,
            qcMap.get(rec.spoolNo),
            paintMap.get(rec.spoolNo),
            laydownMap.get(rec.spoolNo),
          ),
        )
      }
    }
    return map
  }, [readiness, mcRecords, qcRecords, paintRecords, laydownRecords])
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

export function usePaintRecord(spoolNo: string): PaintRecord | undefined {
  return usePaintStore((s) => s.getRecord(spoolNo))
}

export function useLaydownRecord(spoolNo: string): LaydownRecord | undefined {
  return useLaydownStore((s) => s.getRecord(spoolNo))
}
