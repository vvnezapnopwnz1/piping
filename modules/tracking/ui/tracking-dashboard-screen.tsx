"use client"

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

  if (errorProjectId === projectId) return <Alert variant="destructive"><AlertTitle>Unable to load tracking dashboard</AlertTitle><AlertDescription>Check project access and use Refresh to try again.</AlertDescription></Alert>
  if (!state || state.projectId !== projectId) return <Skeleton className="h-64 w-full" />
  const metrics = [
    ["Distinct spools scanned", state.dashboard.distinctSpoolsScanned], ["Active spools", state.dashboard.activeSpools],
    ["Scans this month", state.dashboard.scansThisMonth], ["Currently in transit", state.dashboard.inTransit], ["Overdue transit", state.dashboard.overdue],
  ] as const
  return <div className="space-y-6 p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Tracking Dashboard</h1><p className="text-sm text-muted-foreground">Project-scoped spool movement and location projections.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setRefreshToken((value) => value + 1)}><RefreshCw />Refresh</Button><Button variant="outline" onClick={() => window.print()}><Printer />Print</Button></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value]) => <Card key={label}><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-3xl">{value}</CardTitle></CardHeader></Card>)}</div>
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Location occupancy</CardTitle><CardDescription>Current effective location versus configured capacity.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Location</TableHead><TableHead>Category</TableHead><TableHead>Occupancy</TableHead></TableRow></TableHeader><TableBody>{state.occupancy.length === 0 ? <TableRow><TableCell colSpan={3}>No active locations.</TableCell></TableRow> : state.occupancy.map((row) => <TableRow key={row.locationId}><TableCell>{row.locationCode}</TableCell><TableCell>{row.categoryCode}</TableCell><TableCell>{row.currentCount} / {trackingCapacityLabel(row.capacity)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle>Most-used dimensions</CardTitle><CardDescription>Derived from effective recorded scans.</CardDescription></CardHeader><CardContent className="grid gap-3 text-sm"><p><span className="text-muted-foreground">Device:</span> {state.dashboard.mostUsedDevice ?? "No recorded usage"}</p><p><span className="text-muted-foreground">Operator membership:</span> {state.dashboard.mostUsedOperator ?? "No recorded usage"}</p><p><span className="text-muted-foreground">Location:</span> {state.dashboard.mostUsedLocation ?? "No recorded usage"}</p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Recent activity</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Direction</TableHead><TableHead>Spool ID</TableHead><TableHead>Source</TableHead></TableRow></TableHeader><TableBody>{state.dashboard.recentActivity.length === 0 ? <TableRow><TableCell colSpan={4}>No tracking events yet.</TableCell></TableRow> : state.dashboard.recentActivity.map((event) => <TableRow key={event.id}><TableCell>{new Date(event.occurredAt).toLocaleString()}</TableCell><TableCell className="uppercase">{event.direction}</TableCell><TableCell>{event.spoolId}</TableCell><TableCell>{event.source}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
  </div>
}
