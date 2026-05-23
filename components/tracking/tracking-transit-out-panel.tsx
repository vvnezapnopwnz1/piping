"use client"

import { useMemo } from "react"
import { ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useScopeLock } from "@/lib/scope-lock"
import { useTrackingEnrichedRows } from "./use-tracking-rows"

interface Props {
  onSelectSpool: (spoolNo: string) => void
}

export function TrackingTransitOutPanel({ onSelectSpool }: Props) {
  const rows = useTrackingEnrichedRows()
  const scope = useScopeLock()

  const items = useMemo(() => {
    const result: {
      spoolNo: string
      fromLocation?: string
      outFor?: number
    }[] = []
    rows.forEach((row) => {
      if (!scope.isInScope(row.spool.pdsAreaCode)) return
      if (row.transitOut.isTransitOut) {
        result.push({
          spoolNo: row.spool.spoolNo,
          fromLocation: row.transitOut.fromLocation,
          outFor: row.transitOut.outFor,
        })
      }
    })
    return result.sort((a, b) => (b.outFor ?? 0) - (a.outFor ?? 0))
  }, [rows, scope])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Transit out alerts</CardTitle>
        <CardDescription>
          Spools scanned OUT beyond maximum transit time ({items.length})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No transit-out alerts at this time.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.spoolNo}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onSelectSpool(item.spoolNo)}
                  className="font-mono text-[13px] font-semibold text-sky-600 hover:underline"
                >
                  {item.spoolNo}
                </button>
                <p className="mt-1 text-sm text-slate-700">
                  Out from {item.fromLocation ?? "unknown"}, {item.outFor} days ago
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
