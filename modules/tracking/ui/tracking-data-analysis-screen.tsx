"use client"

import * as React from "react"
import { Download, Plus, Printer, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { buildTrackingDataDumpFiles } from "../application/export-tracking-data"
import { createLatestProjectLoader, createTrackingIdempotencyKey } from "../application/manage-tracking"
import type { TrackingDeviceUsageRow, TrackingEventRow, TrackingInconsistencyRow, TrackingOccupancyRow, TrackingTransitAlertRow, TrackingWorklistRow } from "../domain/tracking"
import { getTrackingDataDump, loadTrackingDeviceUsage, loadTrackingEvents, loadTrackingInconsistencies, loadTrackingOccupancy, loadTrackingTransitAlerts, loadTrackingWorklist, recordTrackingEvent } from "../infrastructure/supabase-tracking-repository"
import { filterTrackingWorklist, groupActiveSpoolsByDesignArea } from "./tracking-screen-model"

interface AnalysisState { projectId: string; worklist: TrackingWorklistRow[]; events: TrackingEventRow[]; occupancy: TrackingOccupancyRow[]; transit: TrackingTransitAlertRow[]; usage: TrackingDeviceUsageRow[]; inconsistencies: TrackingInconsistencyRow[] }

function download(filename: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url)
}

export function TrackingDataAnalysisScreen({ projectId, projectCode, canRecord, canAdmin }: { projectId: string; projectCode: string; canRecord: boolean; canAdmin: boolean }) {
  const loader = React.useRef(createLatestProjectLoader<AnalysisState>())
  const [state, setState] = React.useState<AnalysisState | null>(null)
  const [errorProjectId, setErrorProjectId] = React.useState<string | null>(null)
  const [refreshToken, setRefreshToken] = React.useState(0)
  const [query, setQuery] = React.useState("")
  const [selectedSpoolId, setSelectedSpoolId] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [direction, setDirection] = React.useState<"in" | "out" | "manual">("in")
  const [locationId, setLocationId] = React.useState("")
  const [deviceId, setDeviceId] = React.useState("")
  const [occurredAt, setOccurredAt] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [compensatesEventId, setCompensatesEventId] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const refresh = React.useCallback(() => setRefreshToken((value) => value + 1), [])
  React.useEffect(() => {
    const requestLoader = loader.current
    void requestLoader.run(projectId, async () => {
      const client = getSupabaseBrowserClient()
      const [worklist, events, occupancy, transit, usage, inconsistencies] = await Promise.all([
        loadTrackingWorklist(client, projectId), loadTrackingEvents(client, projectId), loadTrackingOccupancy(client, projectId),
        loadTrackingTransitAlerts(client, projectId), loadTrackingDeviceUsage(client, projectId), loadTrackingInconsistencies(client, projectId),
      ])
      return { projectId, worklist, events, occupancy, transit, usage, inconsistencies }
    }, (value) => { setState(value); setSelectedSpoolId(null); setErrorProjectId(null) }).catch(() => setErrorProjectId(projectId))
    return () => requestLoader.invalidate()
  }, [projectId, refreshToken])

  const openEvent = (manual = false) => {
    if (!state) return
    setDirection(manual ? "manual" : "in"); setLocationId(state.occupancy[0]?.locationId ?? ""); setDeviceId(""); setOccurredAt(""); setReason(""); setCompensatesEventId(""); setDialogOpen(true)
  }
  const submit = async () => {
    if (!selectedSpoolId || !locationId || !occurredAt) return
    setSaving(true)
    try {
      await recordTrackingEvent(getSupabaseBrowserClient(), { projectId, spoolId: selectedSpoolId, locationId, deviceId: deviceId || null, direction, occurredAt: new Date(occurredAt).toISOString(), reason: reason || null, compensatesEventId: compensatesEventId || null, idempotencyKey: createTrackingIdempotencyKey() })
      setDialogOpen(false); toast.success("Tracking event recorded"); refresh()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Tracking event failed") } finally { setSaving(false) }
  }
  const exportDump = async (fileIndex: number) => {
    try {
      const dump = await getTrackingDataDump(getSupabaseBrowserClient(), projectId)
      const file = buildTrackingDataDumpFiles(projectCode, dump)[fileIndex]
      if (!file) throw new Error("Tracking export file is not available.")
      download(file.filename, file.content, file.mimeType)
      toast.success(`${file.filename} downloaded`)
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Data dump failed") }
  }

  if (errorProjectId === projectId) return <Alert variant="destructive"><AlertTitle>Unable to load Tracking Data Analysis</AlertTitle><AlertDescription>Check access and retry.</AlertDescription></Alert>
  if (!state || state.projectId !== projectId) return <Skeleton className="h-64 w-full" />
  const filtered = filterTrackingWorklist(state.worklist, query)
  const selected = state.worklist.find((row) => row.spoolId === selectedSpoolId) ?? null
  const history = state.events.filter((event) => event.spoolId === selectedSpoolId)
  const designs = groupActiveSpoolsByDesignArea(state.worklist)
  const neverScanned = state.worklist.filter((row) => row.isActive && !row.hasEverScanned)
  return <div className="space-y-6 p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Tracking Data Analysis</h1><p className="text-sm text-muted-foreground">Effective locations, immutable history and project exceptions.</p></div><div className="flex gap-2"><Button variant="outline" onClick={refresh}><RefreshCw />Refresh</Button><Button variant="outline" onClick={() => window.print()}><Printer />Print</Button></div></div>
    <Tabs defaultValue="spools">
      <TabsList className="flex h-auto flex-wrap"><TabsTrigger value="spools">Spool Location</TabsTrigger><TabsTrigger value="locations">Location</TabsTrigger><TabsTrigger value="design">Design Area</TabsTrigger><TabsTrigger value="consolidation">Consolidation</TabsTrigger></TabsList>
      <TabsContent value="spools" className="space-y-4">
        <div className="flex flex-wrap gap-2"><Input className="max-w-sm" aria-label="Filter spools" placeholder="Filter by ISO, spool, area or location" value={query} onChange={(event) => setQuery(event.target.value)} />{canRecord && <Button disabled={!selected} onClick={() => openEvent(false)}><Plus />Add Event</Button>}{canAdmin && <Button variant="outline" disabled={!selected} onClick={() => openEvent(true)}>Add Correction</Button>}</div>
        <Card><CardContent><Table><TableHeader><TableRow><TableHead>ISO</TableHead><TableHead>Spool</TableHead><TableHead>Area</TableHead><TableHead>Status</TableHead><TableHead>Location</TableHead></TableRow></TableHeader><TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={5}>No spools match this project and filter.</TableCell></TableRow> : filtered.map((row) => <TableRow key={row.spoolId} data-state={row.spoolId === selectedSpoolId ? "selected" : undefined} className="cursor-pointer" onClick={() => setSelectedSpoolId(row.spoolId)}><TableCell>{row.isoNumber}</TableCell><TableCell>{row.spoolNumber}</TableCell><TableCell>{row.pdsAreaCode ?? "Not configured"}</TableCell><TableCell>{row.constructionStatus}</TableCell><TableCell>{row.isInTransit ? "In transit" : row.currentLocationCode ?? "Not scanned"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        {selected && <Card><CardHeader><CardTitle>{selected.spoolNumber} history</CardTitle><CardDescription>No managed spool image is available.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Direction</TableHead><TableHead>Location</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader><TableBody>{history.map((event) => <TableRow key={event.id}><TableCell>{new Date(event.occurredAt).toLocaleString()}</TableCell><TableCell>{event.direction}</TableCell><TableCell>{event.locationCode}</TableCell><TableCell>{event.reason ?? "—"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}
      </TabsContent>
      <TabsContent value="locations"><Card><CardHeader><CardTitle>Locations</CardTitle><CardDescription>Current active occupancy; erected spools are excluded.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Location</TableHead><TableHead>Category</TableHead><TableHead>Current / capacity</TableHead><TableHead>Transit departures</TableHead></TableRow></TableHeader><TableBody>{state.occupancy.map((row) => <TableRow key={row.locationId}><TableCell>{row.locationCode}</TableCell><TableCell>{row.categoryCode}</TableCell><TableCell>{row.currentCount} / {row.capacity ?? "Not configured"}</TableCell><TableCell>{state.transit.filter((item) => item.departureLocationCode === row.locationCode).length}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
      <TabsContent value="design"><Card><CardHeader><CardTitle>Design areas</CardTitle><CardDescription>Active stable spools grouped by accepted PDS/design-area data. No managed design image is available.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Area</TableHead><TableHead>Active spools</TableHead><TableHead>Locations</TableHead></TableRow></TableHeader><TableBody>{designs.map((row) => <TableRow key={row.code}><TableCell>{row.code}</TableCell><TableCell>{row.activeSpoolCount}</TableCell><TableCell>{row.locations.join(", ") || "In transit / not scanned"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
      <TabsContent value="consolidation" className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardDescription>Inconsistencies</CardDescription><CardTitle className="text-3xl">{state.inconsistencies.length}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Overdue transit</CardDescription><CardTitle className="text-3xl">{state.transit.filter((row) => row.isOverdue).length}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Never-scanned active</CardDescription><CardTitle className="text-3xl">{neverScanned.length}</CardTitle></CardHeader></Card></div>{canAdmin && <div className="flex flex-wrap gap-2"><Button onClick={() => void exportDump(0)}><Download />Download active spools CSV</Button><Button variant="outline" onClick={() => void exportDump(1)}><Download />Download sub-locations CSV</Button><Button variant="outline" onClick={() => void exportDump(2)}><Download />Download PDA users CSV</Button></div>}<Card><CardHeader><CardTitle>Exceptions</CardTitle></CardHeader><CardContent>{state.inconsistencies.length === 0 && state.transit.every((row) => !row.isOverdue) && neverScanned.length === 0 ? <p className="text-sm text-muted-foreground">No current exceptions.</p> : <ul className="list-disc space-y-1 pl-5 text-sm">{state.inconsistencies.map((row) => <li key={row.eventId}>{row.issueCode} — spool {row.spoolId}</li>)}{state.transit.filter((row) => row.isOverdue).map((row) => <li key={row.spoolId}>Overdue transit — {row.spoolNumber} ({row.transitDays} days)</li>)}{neverScanned.map((row) => <li key={row.spoolId}>Never scanned — {row.spoolNumber}</li>)}</ul>}</CardContent></Card></TabsContent>
    </Tabs>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{direction === "manual" ? "Add tracking correction" : "Add tracking event"}</DialogTitle><DialogDescription>The saved database event is append-only. The screen refetches durable state after success.</DialogDescription></DialogHeader><div className="grid gap-3"><Label htmlFor="tracking-direction">Direction</Label><select id="tracking-direction" className="h-9 rounded-md border bg-background px-3 text-sm" value={direction} onChange={(event) => setDirection(event.target.value as "in" | "out" | "manual")} disabled={!canAdmin && direction === "manual"}><option value="in">In</option><option value="out">Out</option>{canAdmin && <option value="manual">Manual</option>}</select><Label htmlFor="tracking-location">Location</Label><select id="tracking-location" className="h-9 rounded-md border bg-background px-3 text-sm" value={locationId} onChange={(event) => setLocationId(event.target.value)}>{state.occupancy.map((row) => <option key={row.locationId} value={row.locationId}>{row.locationCode}</option>)}</select><Label htmlFor="tracking-device">Device</Label><select id="tracking-device" className="h-9 rounded-md border bg-background px-3 text-sm" value={deviceId} onChange={(event) => setDeviceId(event.target.value)}><option value="">No device</option>{[...new Map(state.usage.map((row) => [row.deviceId, row])).values()].map((row) => <option key={row.deviceId} value={row.deviceId}>{row.deviceCode}</option>)}</select><Label htmlFor="tracking-time">Occurred at</Label><Input id="tracking-time" type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />{canAdmin && <><Label htmlFor="tracking-target">Event to compensate (optional)</Label><select id="tracking-target" className="h-9 rounded-md border bg-background px-3 text-sm" value={compensatesEventId} onChange={(event) => { setCompensatesEventId(event.target.value); if (event.target.value) setDirection("manual") }}><option value="">Manual adjustment only</option>{history.filter((event) => !event.compensatesEventId).map((event) => <option key={event.id} value={event.id}>{event.direction} — {new Date(event.occurredAt).toLocaleString()}</option>)}</select></>}<Label htmlFor="tracking-reason">Reason {direction === "manual" || compensatesEventId ? "(required)" : "(optional)"}</Label><Textarea id="tracking-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button disabled={saving || !locationId || !occurredAt || ((direction === "manual" || Boolean(compensatesEventId)) && !reason.trim())} onClick={() => void submit()}>Save event</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
