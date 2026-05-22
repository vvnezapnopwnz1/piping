"use client"

import { useMemo } from "react"
import { Activity, AlertOctagon, CheckCircle2, RefreshCw, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useBatchesStore, useBatchesKPIs } from "@/store"

export function NdeDashboard() {
  const batches = useBatchesStore((s) => s.batches)
  const kpis = useBatchesKPIs()

  const advancedKpis = useMemo(() => {
    let activePenaltyShoots = 0
    let activeR1 = 0
    const perSub = new Map<string, { accepted: number; rejected: number }>()
    const perWelder = new Map<string, { accepted: number; rejected: number }>()

    for (const b of batches) {
      if (b.history.some((h) => h.title === "PENALTY SHOOT triggered") && b.status !== "Closed") {
        activePenaltyShoots++
      }
      for (const w of b.welds) {
        if (w.category === "NDE100" && w.parentWeldId && b.status !== "Closed") {
          activeR1++
        }
        const subEntry = perSub.get(b.subcontractor) ?? { accepted: 0, rejected: 0 }
        const welderEntry = perWelder.get(w.welder) ?? { accepted: 0, rejected: 0 }
        if (w.result === "Accepted") {
          subEntry.accepted++
          welderEntry.accepted++
        } else if (w.result === "Rejected") {
          subEntry.rejected++
          welderEntry.rejected++
        }
        perSub.set(b.subcontractor, subEntry)
        perWelder.set(w.welder, welderEntry)
      }
    }

    const subs = Array.from(perSub.entries())
      .map(([sub, { accepted, rejected }]) => {
        const total = accepted + rejected
        return {
          sub,
          accepted,
          rejected,
          rate: total > 0 ? Math.round((accepted / total) * 100) : 0,
          total,
        }
      })
      .sort((a, b) => b.total - a.total)

    const welders = Array.from(perWelder.entries())
      .map(([welder, { accepted, rejected }]) => {
        const total = accepted + rejected
        return {
          welder,
          accepted,
          rejected,
          rate: total > 0 ? Math.round((accepted / total) * 100) : 0,
          total,
        }
      })
      .filter((w) => w.total > 0)
      .sort((a, b) => b.rejected - a.rejected)
      .slice(0, 8)

    return { activePenaltyShoots, activeR1, subs, welders }
  }, [batches])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">NDE Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acceptance rates, active rework cycles, and welder performance — last 30 days.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Acceptance rate (30d)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-emerald-700">{kpis.acceptanceRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-red-600" /> Active Penalty Shoots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-red-700">{advancedKpis.activePenaltyShoots}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-orange-600" /> Active R1 joints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-orange-700">{advancedKpis.activeR1}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-600" /> Awaiting Results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-sky-700">{kpis.awaitingResults}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Subcontractor performance</CardTitle>
            <CardDescription>Acceptance rate per NDE lab</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {advancedKpis.subs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No data yet.</div>
              ) : (
                advancedKpis.subs.map((s) => (
                  <div key={s.sub} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.sub}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {s.accepted} accepted · {s.rejected} rejected
                      </div>
                    </div>
                    <Badge
                      className={
                        s.rate >= 95
                          ? "bg-emerald-100 text-emerald-700"
                          : s.rate >= 85
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }
                    >
                      {s.rate}%
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Welder rejection leaders
            </CardTitle>
            <CardDescription>Top 8 welders by rejection count (penalty-shoot risk)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {advancedKpis.welders.length === 0 ? (
                <div className="text-sm text-muted-foreground">No data yet.</div>
              ) : (
                advancedKpis.welders.map((w) => (
                  <div key={w.welder} className="flex items-center gap-3">
                    <div className="font-mono text-sm w-20">{w.welder}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-muted-foreground">
                        {w.accepted} accepted · {w.rejected} rejected
                      </div>
                    </div>
                    <Badge
                      className={
                        w.rejected >= 4
                          ? "bg-red-100 text-red-700"
                          : w.rejected >= 2
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                      }
                    >
                      {w.rate}%
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
