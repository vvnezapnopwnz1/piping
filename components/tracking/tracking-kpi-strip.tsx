"use client"

import { useMemo } from "react"
import { TrendingUp, AlertTriangle, ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSpoolTrackingStore } from "@/store/spool-tracking-store"
import { useScopeLock } from "@/lib/scope-lock"
import { cn } from "@/lib/utils"
import {
  useMaxTransitDays,
  useTrackingEnrichedRows,
  useTrackingSpools,
} from "./use-tracking-rows"

export function TrackingKpiStrip() {
  const events = useSpoolTrackingStore((s) => s.events)
  const spools = useTrackingSpools()
  const rows = useTrackingEnrichedRows()
  const maxTransitDays = useMaxTransitDays()
  const scope = useScopeLock()

  const computed = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10)
    const scansToday = events.filter((e) => e.at.startsWith(todayIso)).length

    let active = 0
    let inconsistent = 0
    let transitOut = 0
    let inScopeTotal = 0

    rows.forEach((row) => {
      if (!scope.isInScope(row.spool.pdsAreaCode)) return
      inScopeTotal++
      if (row.isActive) active++
      if (row.inconsistency.isInconsistent) inconsistent++
      if (row.transitOut.isTransitOut) transitOut++
    })

    return { active, scansToday, inconsistent, transitOut, totalSpools: inScopeTotal || spools.length }
  }, [events, rows, scope, spools.length])

  const stats = [
    {
      title: "Spools tracked",
      value: computed.active.toLocaleString(),
      subtitle: "Currently active (Start Fab → Erected)",
      bottom: `${computed.scansToday} scanned today`,
      tone: "default" as const,
      icon: TrendingUp,
      bottomClassName: "text-emerald-600",
    },
    {
      title: "Total spools in project",
      value: computed.totalSpools.toLocaleString(),
      subtitle: "All spools across all lifecycle stages",
      bottom: scope.active ? `Scope: ${scope.subCode}` : "All areas",
      tone: "default" as const,
      icon: TrendingUp,
      bottomClassName: "text-slate-600",
    },
    {
      title: "Inconsistencies",
      value: computed.inconsistent.toString(),
      subtitle: "Status vs location mismatches",
      bottom: computed.inconsistent > 0 ? "Action needed" : "All clean",
      tone: computed.inconsistent > 0 ? ("amber" as const) : ("default" as const),
      icon: AlertTriangle,
      bottomClassName:
        computed.inconsistent > 0 ? "text-amber-600" : "text-emerald-600",
    },
    {
      title: "Transit out",
      value: computed.transitOut.toString(),
      subtitle: `Spools not scanned in > ${maxTransitDays} days`,
      bottom: computed.transitOut > 0 ? "Investigate" : "All in transit OK",
      tone: computed.transitOut > 0 ? ("red" as const) : ("default" as const),
      icon: ArrowUpRight,
      bottomClassName: computed.transitOut > 0 ? "text-red-600" : "text-emerald-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card
            key={stat.title}
            className={cn(
              stat.tone === "amber" && "border-l-4 border-l-amber-500",
              stat.tone === "red" && "border-l-4 border-l-red-500",
            )}
          >
            <CardHeader className="gap-1 pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                {stat.title}
              </CardDescription>
              <CardTitle className="text-[30px] font-semibold tracking-tight">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
              <div
                className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  stat.bottomClassName,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{stat.bottom}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
