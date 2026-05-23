"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminStore } from "@/store/admin-store"
import { useScopeLock } from "@/lib/scope-lock"
import { TrackingSpoolTable } from "./tracking-spool-table"
import { useTrackingEnrichedRows } from "./use-tracking-rows"

export function TrackingDataAnalysisDesignAreaTab() {
  const pdsAreas = useAdminStore((s) => s.pdsAreas)
  const rows = useTrackingEnrichedRows()
  const scope = useScopeLock()
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const hasLinkedSpools = useMemo(
    () => rows.some((r) => r.spool.pdsAreaCode),
    [rows],
  )

  const areaCounts = useMemo(() => {
    const map = new Map<string, number>()
    rows.forEach((row) => {
      if (!scope.isInScope(row.spool.pdsAreaCode)) return
      if (!row.spool.pdsAreaCode) return
      map.set(row.spool.pdsAreaCode, (map.get(row.spool.pdsAreaCode) ?? 0) + 1)
    })
    return map
  }, [rows, scope])

  const selectedArea = selectedCode
    ? pdsAreas.find((a) => a.code === selectedCode)
    : null

  if (selectedCode && selectedArea) {
    const filteredRows = rows.filter((r) => r.spool.pdsAreaCode === selectedCode)
    if (filteredRows.length === 0) {
      return (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setSelectedCode(null)}
            className="text-sm text-sky-600 hover:underline"
          >
            ← All design areas
          </button>
          <Card>
            <CardContent className="py-8 text-sm text-slate-600">
              No spools are linked to {selectedArea.code} yet. Spools will appear here
              once spool data carries pdsAreaCode (Phase 7).
            </CardContent>
          </Card>
        </div>
      )
    }
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedCode(null)}
          className="text-sm text-sky-600 hover:underline"
        >
          ← All design areas
        </button>
        <TrackingSpoolTable selectedLocation={null} activeOnly />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!hasLinkedSpools ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-900">
            Spools will be linked to design areas once spool data carries pdsAreaCode
            (Phase 7). PDS area cards below show referential definitions only.
          </CardContent>
        </Card>
      ) : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pdsAreas
          .filter((a) => a.active)
          .map((area) => (
            <button
              key={area.code}
              type="button"
              onClick={() => setSelectedCode(area.code)}
              className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md"
            >
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-sm font-semibold">{area.code}</CardTitle>
                <CardDescription className="text-xs">{area.name}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-2xl font-semibold text-slate-900">
                  {areaCounts.get(area.code) ?? 0}
                </p>
                <p className="text-xs text-slate-500">spools in area</p>
              </CardContent>
            </button>
          ))}
      </div>
    </div>
  )
}
