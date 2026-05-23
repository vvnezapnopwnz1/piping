"use client"

import { useMemo, useState } from "react"
import { MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  TRACKING_LOCATIONS,
  deriveCurrentLocation,
  groupEventsBySpool,
  type TrackingLocationCategory,
} from "@/lib/spool-tracking"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { useScopeLock } from "@/lib/scope-lock"
import { useTrackingSpools } from "./use-tracking-rows"

type ZoneFilter = "All zones" | TrackingLocationCategory

const ZONE_FILTERS: ZoneFilter[] = [
  "All zones",
  "Fab shop",
  "Paint shop",
  "Laydown",
  "Erection area",
]

function getCapacityTone(count: number, capacity: number) {
  const ratio = (count / capacity) * 100
  if (ratio > 90)
    return {
      cardClassName: "border-red-200 bg-red-50",
      progressClassName: "bg-red-500",
      textClassName: "text-red-700",
    }
  if (ratio >= 70)
    return {
      cardClassName: "border-amber-200 bg-amber-50",
      progressClassName: "bg-amber-500",
      textClassName: "text-amber-700",
    }
  return {
    cardClassName: "border-emerald-200 bg-emerald-50",
    progressClassName: "bg-emerald-500",
    textClassName: "text-emerald-700",
  }
}

interface Props {
  selectedLocation: string | null
  onSelectLocation: (location: string | null) => void
}

export function TrackingLocationMap({ selectedLocation, onSelectLocation }: Props) {
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("All zones")
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

  const visibleTiles = useMemo(
    () =>
      TRACKING_LOCATIONS.filter(
        (tile) => zoneFilter === "All zones" || tile.category === zoneFilter,
      ),
    [zoneFilter],
  )

  return (
    <Card>
      <CardHeader className="gap-4 pb-2 md:flex md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Site location map</CardTitle>
          <CardDescription>
            Capacity monitoring across all tracked locations
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {ZONE_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setZoneFilter(filter)
                onSelectLocation(null)
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                zoneFilter === filter
                  ? "border-sky-300 bg-sky-100 text-sky-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleTiles.map((tile) => {
            const count = counts.get(tile.name) ?? 0
            const tone = getCapacityTone(count, tile.capacity)
            const percentage = Math.min(
              Math.round((count / tile.capacity) * 100),
              100,
            )
            const isSelected = selectedLocation === tile.name
            return (
              <button
                key={tile.name}
                type="button"
                onClick={() =>
                  onSelectLocation(isSelected ? null : tile.name)
                }
                className={cn(
                  "min-h-[100px] rounded-lg border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  tone.cardClassName,
                  isSelected && "ring-2 ring-sky-500 ring-offset-2",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{tile.name}</p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                      {count}
                    </p>
                  </div>
                  <MapPin className="h-5 w-5 text-slate-400" />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      {count} / {tile.capacity} capacity
                    </span>
                    <span className={cn("font-medium", tone.textClassName)}>
                      {percentage}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/80">
                    <div
                      className={cn("h-full rounded-full", tone.progressClassName)}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
