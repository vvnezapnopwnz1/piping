"use client"

import { useEffect, useRef, useState } from "react"
import { TrackingKpiStrip } from "@/components/tracking/tracking-kpi-strip"
import { TrackingLocationMap } from "@/components/tracking/tracking-location-map"
import { TrackingScanTrend } from "@/components/tracking/tracking-scan-trend"
import { TrackingPdaCard } from "@/components/tracking/tracking-pda-card"
import { TrackingSpoolTable } from "@/components/tracking/tracking-spool-table"
import { TrackingInconsistencyPanel } from "@/components/tracking/tracking-inconsistency-panel"
import { TrackingTransitOutPanel } from "@/components/tracking/tracking-transit-out-panel"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { useNotificationsStore } from "@/store/notifications-store"
import { deriveTransitOutFlag, groupEventsBySpool } from "@/lib/spool-tracking"
import { useMaxTransitDays, useTrackingEnrichedRows } from "@/components/tracking/use-tracking-rows"

export function SpoolTrackingDashboard() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedSpool, setSelectedSpool] = useState<string | null>(null)

  const events = useSpoolTrackingStore((s) => s.events)
  const rows = useTrackingEnrichedRows()
  const maxTransitDays = useMaxTransitDays()
  const pushNotification = useNotificationsStore((s) => s.pushNotification)
  const prevTransitOutRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const eventsBySpool = groupEventsBySpool(events)
    const currentTransitOut = new Set<string>()
    rows.forEach((row) => {
      const flag = deriveTransitOutFlag(
        eventsBySpool.get(row.spool.spoolNo) ?? [],
        maxTransitDays,
      )
      if (flag.isTransitOut) currentTransitOut.add(row.spool.spoolNo)
    })
    const newEntries = [...currentTransitOut].filter(
      (id) => !prevTransitOutRef.current.has(id),
    )
    if (newEntries.length > 0 && prevTransitOutRef.current.size > 0) {
      newEntries.forEach((spoolNo) => {
        pushNotification({
          severity: "warning",
          category: "tracking",
          title: `${spoolNo}: transit out > ${maxTransitDays} days`,
          description:
            "Spool scanned OUT but not yet scanned IN at destination",
          href: "/tracking",
        })
      })
    }
    prevTransitOutRef.current = currentTransitOut
  }, [events, rows, maxTransitDays, pushNotification])

  return (
    <div className="space-y-6">
      <TrackingKpiStrip />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <TrackingLocationMap
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
          />
        </div>
        <div className="grid gap-4 xl:col-span-2">
          <TrackingScanTrend />
          <TrackingPdaCard />
        </div>
      </div>

      <TrackingSpoolTable
        selectedLocation={selectedLocation}
        selectedSpool={selectedSpool}
        onSelectSpool={setSelectedSpool}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TrackingInconsistencyPanel onSelectSpool={setSelectedSpool} />
        <TrackingTransitOutPanel onSelectSpool={setSelectedSpool} />
      </div>
    </div>
  )
}
