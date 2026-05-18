"use client"

import { useMemo } from "react"
import {
  deriveSpoolErectionStage,
  ERECTION_STAGE_ORDER,
  type SpoolErectionStage,
} from "@/lib/erection-stage"
import { useErectionStore } from "@/store/erection-store"
import { useToSiteStore } from "@/store/to-site-store"

export function useSpoolErectionStages(): Array<{
  spoolNo: string
  stage: SpoolErectionStage
}> {
  const fieldWelds = useErectionStore((state) => state.fieldWelds)
  const toSiteRecords = useToSiteStore((state) => state.records)

  return useMemo(() => {
    const spoolNos = [
      ...new Set([
        ...fieldWelds.map((fieldWeld) => fieldWeld.spoolNo),
        ...toSiteRecords.map((record) => record.spoolNo),
      ]),
    ].sort()
    const toSiteMap = new Map(toSiteRecords.map((record) => [record.spoolNo, record]))

    return spoolNos.map((spoolNo) => ({
      spoolNo,
      stage: deriveSpoolErectionStage(spoolNo, fieldWelds, toSiteMap.get(spoolNo)),
    }))
  }, [fieldWelds, toSiteRecords])
}

export function useSpoolErectionStageCounts(): Record<SpoolErectionStage, number> {
  const stages = useSpoolErectionStages()

  return useMemo(() => {
    const counts = Object.fromEntries(
      ERECTION_STAGE_ORDER.map((stage) => [stage, 0]),
    ) as Record<SpoolErectionStage, number>

    for (const spool of stages) {
      counts[spool.stage] += 1
    }

    return counts
  }, [stages])
}

export function useSpoolsAtErectionStage(stage: SpoolErectionStage): string[] {
  const stages = useSpoolErectionStages()

  return useMemo(
    () =>
      stages
        .filter((spool) => spool.stage === stage)
        .map((spool) => spool.spoolNo)
        .sort(),
    [stage, stages],
  )
}
