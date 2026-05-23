"use client"

import { useMemo } from "react"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useScopeLock } from "@/lib/scope-lock"
import { useTrackingEnrichedRows } from "./use-tracking-rows"

interface Props {
  onSelectSpool: (spoolNo: string) => void
}

export function TrackingInconsistencyPanel({ onSelectSpool }: Props) {
  const rows = useTrackingEnrichedRows()
  const scope = useScopeLock()

  const items = useMemo(() => {
    const result: { spoolNo: string; reason: string; time: string }[] = []
    rows.forEach((row) => {
      if (!scope.isInScope(row.spool.pdsAreaCode)) return
      if (row.inconsistency.isInconsistent) {
        result.push({
          spoolNo: row.spool.spoolNo,
          reason: row.inconsistency.reason!,
          time: row.cur?.lastScan?.slice(0, 10) ?? "—",
        })
      }
    })
    return result
  }, [rows, scope])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Recent inconsistencies</CardTitle>
        <CardDescription>
          Spools with status and scan mismatches ({items.length})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">
            No inconsistencies — all spools tracked correctly.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.spoolNo}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onSelectSpool(item.spoolNo)}
                  className="font-mono text-[13px] font-semibold text-sky-600 hover:underline"
                >
                  {item.spoolNo}
                </button>
                <p className="mt-1 text-sm text-slate-700">{item.reason}</p>
                <p className="mt-1 text-xs text-slate-500">{item.time}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
