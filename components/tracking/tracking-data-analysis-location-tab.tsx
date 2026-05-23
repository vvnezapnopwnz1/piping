"use client"

import { useMemo, useState } from "react"
import { MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  TRACKING_LOCATIONS,
  deriveCurrentLocation,
  groupEventsBySpool,
} from "@/lib/spool-tracking"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { useScopeLock } from "@/lib/scope-lock"
import { TrackingSpoolTable } from "./tracking-spool-table"
import { useTrackingSpools } from "./use-tracking-rows"

export function TrackingDataAnalysisLocationTab() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const events = useSpoolTrackingStore((s) => s.events)
  const spools = useTrackingSpools()
  const scope = useScopeLock()

  const counts = useMemo(() => {
    const eventsBySpool = groupEventsBySpool(events)
    const result = new Map<string, number>()
    spools.forEach((s) => {
      if (!scope.isInScope(s.pdsAreaCode)) return
      const cur = deriveCurrentLocation(eventsBySpool.get(s.spoolNo) ?? [])
      if (cur && !cur.isTransitOut) {
        result.set(cur.location, (result.get(cur.location) ?? 0) + 1)
      }
    })
    return result
  }, [events, spools, scope])

  if (selectedLocation) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedLocation(null)}
          className="text-sm text-sky-600 hover:underline"
        >
          ← All locations
        </button>
        <TrackingSpoolTable
          selectedLocation={selectedLocation}
          activeOnly
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {TRACKING_LOCATIONS.map((loc) => {
        const count = counts.get(loc.name) ?? 0
        const pct = Math.min(Math.round((count / loc.capacity) * 100), 100)
        return (
          <button
            key={loc.name}
            type="button"
            onClick={() => setSelectedLocation(loc.name)}
            className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{loc.name}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{count}</p>
                <p className="text-xs text-slate-500">{loc.category}</p>
              </div>
              <MapPin className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full",
                  pct > 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}
