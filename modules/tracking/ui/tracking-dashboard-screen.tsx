"use client"

import { useLocale, useTranslations } from "next-intl"
import { formatMoment } from "@/i18n/format"
import * as React from "react"
import { Printer, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { buildTrackingDashboard, createLatestProjectLoader } from "../application/manage-tracking"
import { trackingCapacityLabel, type TrackingDashboard, type TrackingOccupancyRow } from "../domain/tracking"
import { loadTrackingDeviceUsage, loadTrackingEvents, loadTrackingOccupancy, loadTrackingTransitAlerts, loadTrackingWorklist } from "../infrastructure/supabase-tracking-repository"

interface DashboardState { projectId: string; dashboard: TrackingDashboard; occupancy: TrackingOccupancyRow[] }

export function TrackingDashboardScreen({ projectId }: { projectId: string }) {
  const locale = useLocale()
  const t = useTranslations("tracking")
  const loader = React.useRef(createLatestProjectLoader<DashboardState>())
  const [state, setState] = React.useState<DashboardState | null>(null)
  const [errorProjectId, setErrorProjectId] = React.useState<string | null>(null)
  const [refreshToken, setRefreshToken] = React.useState(0)

  React.useEffect(() => {
    const requestLoader = loader.current
    void requestLoader.run(projectId, async () => {
      const client = getSupabaseBrowserClient()
      const [worklist, events, occupancy, transit, usage] = await Promise.all([
        loadTrackingWorklist(client, projectId), loadTrackingEvents(client, projectId), loadTrackingOccupancy(client, projectId),
        loadTrackingTransitAlerts(client, projectId), loadTrackingDeviceUsage(client, projectId),
      ])
      return { projectId, dashboard: buildTrackingDashboard(worklist, events, usage, transit.filter((row) => row.isOverdue).length), occupancy }
    }, (value) => { setState(value); setErrorProjectId(null) }).catch(() => setErrorProjectId(projectId))
    return () => requestLoader.invalidate()
  }, [projectId, refreshToken])

  if (errorProjectId === projectId) return <Alert variant="destructive"><AlertTitle>{t("dashboard.loadError")}</AlertTitle><AlertDescription>{t("dashboard.loadErrorDescription")}</AlertDescription></Alert>
  if (!state || state.projectId !== projectId) return <Skeleton className="h-64 w-full" />
  const metrics = [
    [t("dashboard.metrics.distinctSpoolsScanned"), state.dashboard.distinctSpoolsScanned], [t("dashboard.metrics.activeSpools"), state.dashboard.activeSpools],
    [t("dashboard.metrics.scansThisMonth"), state.dashboard.scansThisMonth], [t("dashboard.metrics.inTransit"), state.dashboard.inTransit], [t("dashboard.metrics.overdue"), state.dashboard.overdue],
  ] as const
  return <div className="space-y-6 p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1><p className="text-sm text-muted-foreground">{t("dashboard.description")}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setRefreshToken((value) => value + 1)}><RefreshCw />{t("actions.refresh")}</Button><Button variant="outline" onClick={() => window.print()}><Printer />{t("actions.print")}</Button></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value]) => <Card key={label}><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>)}</div>
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>{t("dashboard.occupancy.title")}</CardTitle><CardDescription>{t("dashboard.occupancy.description")}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{t("dashboard.occupancy.location")}</TableHead><TableHead>{t("dashboard.occupancy.category")}</TableHead><TableHead>{t("dashboard.occupancy.occupancy")}</TableHead></TableRow></TableHeader><TableBody>{state.occupancy.length === 0 ? <TableRow><TableCell colSpan={3}>{t("dashboard.occupancy.empty")}</TableCell></TableRow> : state.occupancy.map((row) => <TableRow key={row.locationId}><TableCell>{row.locationCode}</TableCell><TableCell>{row.categoryCode}</TableCell><TableCell>{row.currentCount} / {trackingCapacityLabel(row.capacity, t("notConfigured"))}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle>{t("dashboard.dimensions.title")}</CardTitle><CardDescription>{t("dashboard.dimensions.description")}</CardDescription></CardHeader><CardContent className="grid gap-3 text-sm"><p><span className="text-muted-foreground">{t("dashboard.dimensions.device")}</span> {state.dashboard.mostUsedDevice ?? t("noRecordedUsage")}</p><p><span className="text-muted-foreground">{t("dashboard.dimensions.operator")}</span> {state.dashboard.mostUsedOperator ?? t("noRecordedUsage")}</p><p><span className="text-muted-foreground">{t("dashboard.dimensions.location")}</span> {state.dashboard.mostUsedLocation ?? t("noRecordedUsage")}</p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>{t("dashboard.recentActivity.title")}</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{t("dashboard.recentActivity.time")}</TableHead><TableHead>{t("dashboard.recentActivity.direction")}</TableHead><TableHead>{t("dashboard.recentActivity.spoolId")}</TableHead><TableHead>{t("dashboard.recentActivity.source")}</TableHead></TableRow></TableHeader><TableBody>{state.dashboard.recentActivity.length === 0 ? <TableRow><TableCell colSpan={4}>{t("dashboard.recentActivity.empty")}</TableCell></TableRow> : state.dashboard.recentActivity.map((event) => <TableRow key={event.id}><TableCell>{formatMoment(event.occurredAt, locale)}</TableCell><TableCell className="uppercase">{event.direction in { in: 1, out: 1, manual: 1 } ? t(`directions.${event.direction as "in" | "out" | "manual"}`) : event.direction}</TableCell><TableCell>{event.spoolId}</TableCell><TableCell>{event.source}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
  </div>
}
