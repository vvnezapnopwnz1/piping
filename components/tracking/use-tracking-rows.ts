"use client"

import { useMemo } from "react"
import { useSpoolReadiness } from "@/store/welds-store"
import { useSpoolStages } from "@/store/spool-stage"
import { useErectedStore } from "@/store/erected-store"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { useAdminStore } from "@/store/admin-store"
import {
  deriveCurrentLocation,
  deriveIsActive,
  deriveInconsistencyFlag,
  deriveTransitOutFlag,
  groupEventsBySpool,
  type TrackingSpool,
} from "@/lib/spool-tracking"
import type { SpoolFabStage } from "@/lib/spool-data"

export interface TrackingEnrichedRow {
  spool: TrackingSpool
  fabStage: SpoolFabStage | undefined
  isActive: boolean
  cur: ReturnType<typeof deriveCurrentLocation>
  inconsistency: ReturnType<typeof deriveInconsistencyFlag>
  transitOut: ReturnType<typeof deriveTransitOutFlag>
}

export function useTrackingSpools(): TrackingSpool[] {
  const readiness = useSpoolReadiness()
  return useMemo(
    () =>
      readiness.map((r) => ({
        spoolNo: r.spoolNo,
        isoNo: r.isoNo,
        pdsAreaCode: undefined,
      })),
    [readiness],
  )
}

export function useMaxTransitDays(): number {
  return useAdminStore((s) => s.projectDefinition?.maxTransitTimeDays ?? 2)
}

export function useTrackingEnrichedRows(): TrackingEnrichedRow[] {
  const spools = useTrackingSpools()
  const events = useSpoolTrackingStore((s) => s.events)
  const stages = useSpoolStages()
  const erectedRecords = useErectedStore((s) => s.records)
  const maxTransitDays = useMaxTransitDays()

  return useMemo(() => {
    const eventsBySpool = groupEventsBySpool(events)
    return spools.map((spool) => {
      const spoolEvents = eventsBySpool.get(spool.spoolNo) ?? []
      const fabStage = stages.get(spool.spoolNo)
      const hasErected = erectedRecords.some((r) => r.spoolNo === spool.spoolNo)
      const cur = deriveCurrentLocation(spoolEvents)
      return {
        spool,
        fabStage,
        isActive: deriveIsActive(fabStage, hasErected),
        cur,
        inconsistency: deriveInconsistencyFlag(
          fabStage,
          cur?.location,
          hasErected,
        ),
        transitOut: deriveTransitOutFlag(spoolEvents, maxTransitDays),
      }
    })
  }, [spools, events, stages, erectedRecords, maxTransitDays])
}
