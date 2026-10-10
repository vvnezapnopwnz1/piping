"use client"

import { useLocale, useTranslations } from "next-intl"
import { formatMoment } from "@/i18n/format"
import * as React from "react"
import { ChevronRight, Download, Plus, Printer, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
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
import { groupActiveSpoolsByDesignArea } from "./tracking-screen-model"

interface AnalysisState { projectId: string; worklist: TrackingWorklistRow[]; events: TrackingEventRow[]; occupancy: TrackingOccupancyRow[]; transit: TrackingTransitAlertRow[]; usage: TrackingDeviceUsageRow[]; inconsistencies: TrackingInconsistencyRow[] }

function download(filename: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url)
}

function createSpoolLocationColumns(t: ReturnType<typeof useTranslations<"tracking">>): ReadonlyArray<DataColumn<TrackingWorklistRow>> {
  return [
    { id: "isoNumber", header: t("analysis.table.iso"), value: (row) => row.isoNumber, searchable: true, filter: "text", className: "font-mono text-xs" },
    { id: "spoolNumber", header: t("analysis.table.spool"), value: (row) => row.spoolNumber, searchable: true, filter: "text", pinned: true, alwaysVisible: true, className: "font-mono text-xs" },
    { id: "pdsAreaCode", header: t("analysis.table.area"), value: (row) => row.pdsAreaCode, searchable: true, filter: "select", cell: (row) => row.pdsAreaCode ?? t("notConfigured") },
    { id: "constructionStatus", header: t("analysis.table.status"), value: (row) => row.constructionStatus, filter: "select" },
    {
      id: "currentLocationCode",
      header: t("analysis.table.location"),
      value: (row) => (row.isInTransit ? t("inTransit") : (row.currentLocationCode ?? t("notScanned"))),
      searchable: true,
      filter: "select",
    },
    {
      id: "open",
      header: "",
      sortable: false,
      alwaysVisible: true,
      value: () => "",
      headerClassName: "w-8",
      className: "text-muted-foreground w-8",
      cell: () => <ChevronRight className="h-4 w-4" aria-hidden="true" />,
    },
  ]
}

export function TrackingDataAnalysisScreen({ projectId, projectCode, canRecord, canAdmin }: { projectId: string; projectCode: string; canRecord: boolean; canAdmin: boolean }) {
  const locale = useLocale()
  const t = useTranslations("tracking")
  const loader = React.useRef(createLatestProjectLoader<AnalysisState>())
  const [state, setState] = React.useState<AnalysisState | null>(null)
  const [errorProjectId, setErrorProjectId] = React.useState<string | null>(null)
  const [refreshToken, setRefreshToken] = React.useState(0)
  const [tableState, setTableState] = useTableUrlState({ namespace: "loc" })
  const [selectedSpoolId, setSelectedSpoolId] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [direction, setDirection] = React.useState<"in" | "out" | "manual">("in")
  const [locationId, setLocationId] = React.useState("")
  const [deviceId, setDeviceId] = React.useState("")
  const [occurredAt, setOccurredAt] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [compensatesEventId, setCompensatesEventId] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const spoolLocationColumns = React.useMemo(() => createSpoolLocationColumns(t), [t])

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
      setDialogOpen(false); toast.success(t("analysis.toasts.eventRecorded")); refresh()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : t("analysis.toasts.eventFailed")) } finally { setSaving(false) }
  }
  const exportDump = async (fileIndex: number) => {
    try {
      const dump = await getTrackingDataDump(getSupabaseBrowserClient(), projectId)
      const file = buildTrackingDataDumpFiles(projectCode, dump, t)[fileIndex]
      if (!file) throw new Error(t("analysis.toasts.exportNotAvailable"))
      download(file.filename, file.content, file.mimeType)
      toast.success(t("analysis.toasts.fileDownloaded", { filename: file.filename }))
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : t("analysis.toasts.dataDumpFailed")) }
  }

  if (errorProjectId === projectId) return <Alert variant="destructive"><AlertTitle>{t("analysis.loadError")}</AlertTitle><AlertDescription>{t("analysis.loadErrorDescription")}</AlertDescription></Alert>
  if (!state || state.projectId !== projectId) return <Skeleton className="h-64 w-full" />
  const selected = state.worklist.find((row) => row.spoolId === selectedSpoolId) ?? null
  const history = state.events.filter((event) => event.spoolId === selectedSpoolId)
  const designs = groupActiveSpoolsByDesignArea(state.worklist)
  const neverScanned = state.worklist.filter((row) => row.isActive && !row.hasEverScanned)
  return <div className="space-y-6 p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">{t("analysis.title")}</h1><p className="text-sm text-muted-foreground">{t("analysis.description")}</p></div><div className="flex gap-2"><Button variant="outline" onClick={refresh}><RefreshCw />{t("actions.refresh")}</Button><Button variant="outline" onClick={() => window.print()}><Printer />{t("actions.print")}</Button></div></div>
    <Tabs defaultValue="spools">
      <TabsList className="flex h-auto flex-wrap"><TabsTrigger value="spools">{t("analysis.tabs.spools")}</TabsTrigger><TabsTrigger value="locations">{t("analysis.tabs.locations")}</TabsTrigger><TabsTrigger value="design">{t("analysis.tabs.design")}</TabsTrigger><TabsTrigger value="consolidation">{t("analysis.tabs.consolidation")}</TabsTrigger></TabsList>
      <TabsContent value="spools" className="space-y-4">
        <Card><CardContent>
          <DataTable
            columns={spoolLocationColumns}
            rows={state.worklist}
            state={tableState}
            onStateChange={setTableState}
            rowId={(row) => row.spoolId}
            onRowClick={(row) => setSelectedSpoolId(row.spoolId)}
            selectedRowId={selectedSpoolId}
            searchPlaceholder={t("analysis.table.searchPlaceholder")}
            emptyTitle={t("analysis.table.emptyTitle")}
            toolbarActions={
              <>
                {canRecord && <Button disabled={!selected} onClick={() => openEvent(false)}><Plus />{t("actions.addEvent")}</Button>}
                {canAdmin && <Button variant="outline" disabled={!selected} onClick={() => openEvent(true)}>{t("actions.addCorrection")}</Button>}
              </>
            }
          />
        </CardContent></Card>
        {selected && <Card><CardHeader><CardTitle>{t("analysis.history.title", { spoolNumber: selected.spoolNumber })}</CardTitle><CardDescription>{t("analysis.history.description")}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{t("analysis.history.time")}</TableHead><TableHead>{t("analysis.history.direction")}</TableHead><TableHead>{t("analysis.history.location")}</TableHead><TableHead>{t("analysis.history.reason")}</TableHead></TableRow></TableHeader><TableBody>{history.map((event) => <TableRow key={event.id}><TableCell>{formatMoment(event.occurredAt, locale)}</TableCell><TableCell>{event.direction in { in: 1, out: 1, manual: 1 } ? t(`directions.${event.direction as "in" | "out" | "manual"}`) : event.direction}</TableCell><TableCell>{event.locationCode}</TableCell><TableCell>{event.reason ?? "—"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>}
      </TabsContent>
      <TabsContent value="locations"><Card><CardHeader><CardTitle>{t("analysis.locationsTab.title")}</CardTitle><CardDescription>{t("analysis.locationsTab.description")}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{t("analysis.locationsTab.location")}</TableHead><TableHead>{t("analysis.locationsTab.category")}</TableHead><TableHead>{t("analysis.locationsTab.currentCapacity")}</TableHead><TableHead>{t("analysis.locationsTab.transitDepartures")}</TableHead></TableRow></TableHeader><TableBody>{state.occupancy.map((row) => <TableRow key={row.locationId}><TableCell>{row.locationCode}</TableCell><TableCell>{row.categoryCode}</TableCell><TableCell>{row.currentCount} / {row.capacity ?? t("notConfigured")}</TableCell><TableCell>{state.transit.filter((item) => item.departureLocationCode === row.locationCode).length}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
      <TabsContent value="design"><Card><CardHeader><CardTitle>{t("analysis.designTab.title")}</CardTitle><CardDescription>{t("analysis.designTab.description")}</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>{t("analysis.designTab.area")}</TableHead><TableHead>{t("analysis.designTab.activeSpools")}</TableHead><TableHead>{t("analysis.designTab.locations")}</TableHead></TableRow></TableHeader><TableBody>{designs.map((row) => <TableRow key={row.code}><TableCell>{row.code}</TableCell><TableCell>{row.activeSpoolCount}</TableCell><TableCell>{row.locations.join(", ") || t("analysis.designTab.inTransitNotScanned")}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
      <TabsContent value="consolidation" className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardDescription>{t("analysis.consolidationTab.inconsistencies")}</CardDescription><CardTitle className="text-3xl">{state.inconsistencies.length}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>{t("analysis.consolidationTab.overdueTransit")}</CardDescription><CardTitle className="text-3xl">{state.transit.filter((row) => row.isOverdue).length}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>{t("analysis.consolidationTab.neverScannedActive")}</CardDescription><CardTitle className="text-3xl">{neverScanned.length}</CardTitle></CardHeader></Card></div>{canAdmin && <div className="flex flex-wrap gap-2"><Button onClick={() => void exportDump(0)}><Download />{t("actions.downloadActiveSpoolsCsv")}</Button><Button variant="outline" onClick={() => void exportDump(1)}><Download />{t("actions.downloadSubLocationsCsv")}</Button><Button variant="outline" onClick={() => void exportDump(2)}><Download />{t("actions.downloadPdaUsersCsv")}</Button></div>}<Card><CardHeader><CardTitle>{t("analysis.consolidationTab.exceptionsTitle")}</CardTitle></CardHeader><CardContent>{state.inconsistencies.length === 0 && state.transit.every((row) => !row.isOverdue) && neverScanned.length === 0 ? <p className="text-sm text-muted-foreground">{t("analysis.consolidationTab.noExceptions")}</p> : <ul className="list-disc space-y-1 pl-5 text-sm">{state.inconsistencies.map((row) => <li key={row.eventId}>{t("analysis.consolidationTab.inconsistencyItem", { issueCode: row.issueCode, spoolId: row.spoolId })}</li>)}{state.transit.filter((row) => row.isOverdue).map((row) => <li key={row.spoolId}>{t("analysis.consolidationTab.overdueItem", { spoolNumber: row.spoolNumber, transitDays: row.transitDays })}</li>)}{neverScanned.map((row) => <li key={row.spoolId}>{t("analysis.consolidationTab.neverScannedItem", { spoolNumber: row.spoolNumber })}</li>)}</ul>}</CardContent></Card></TabsContent>
    </Tabs>
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {direction === "manual" ? t("analysis.dialog.titleCorrection") : t("analysis.dialog.titleEvent")}
          </DialogTitle>
          <DialogDescription>
            {t("analysis.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Label htmlFor="tracking-direction">{t("analysis.dialog.direction")}</Label>
          <select
            id="tracking-direction"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={direction}
            onChange={(event) => setDirection(event.target.value as "in" | "out" | "manual")}
            disabled={!canAdmin && direction === "manual"}
          >
            <option value="in">{t("directions.in")}</option>
            <option value="out">{t("directions.out")}</option>
            {canAdmin && <option value="manual">{t("directions.manual")}</option>}
          </select>

          <Label htmlFor="tracking-location">{t("analysis.dialog.location")}</Label>
          <select
            id="tracking-location"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
          >
            {state.occupancy.map((row) => (
              <option key={row.locationId} value={row.locationId}>
                {row.locationCode}
              </option>
            ))}
          </select>

          <Label htmlFor="tracking-device">{t("analysis.dialog.device")}</Label>
          <select
            id="tracking-device"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
          >
            <option value="">{t("analysis.dialog.noDevice")}</option>
            {[...new Map(state.usage.map((row) => [row.deviceId, row])).values()].map((row) => (
              <option key={row.deviceId} value={row.deviceId}>
                {row.deviceCode}
              </option>
            ))}
          </select>

          <Label htmlFor="tracking-time">{t("analysis.dialog.occurredAt")}</Label>
          <Input
            id="tracking-time"
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
          />

          {canAdmin && (
            <>
              <Label htmlFor="tracking-target">{t("analysis.dialog.compensateTarget")}</Label>
              <select
                id="tracking-target"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={compensatesEventId}
                onChange={(event) => {
                  setCompensatesEventId(event.target.value)
                  if (event.target.value) setDirection("manual")
                }}
              >
                <option value="">{t("analysis.dialog.manualAdjustmentOnly")}</option>
                {history
                  .filter((event) => !event.compensatesEventId)
                  .map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.direction in { in: 1, out: 1, manual: 1 }
                        ? t(`directions.${event.direction as "in" | "out" | "manual"}`)
                        : event.direction}{" "}
                      — {formatMoment(event.occurredAt, locale)}
                    </option>
                  ))}
              </select>
            </>
          )}

          <Label htmlFor="tracking-reason">
            {direction === "manual" || compensatesEventId
              ? t("analysis.dialog.reasonRequired")
              : t("analysis.dialog.reasonOptional")}
          </Label>
          <Textarea
            id="tracking-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            disabled={
              saving ||
              !locationId ||
              !occurredAt ||
              ((direction === "manual" || Boolean(compensatesEventId)) && !reason.trim())
            }
            onClick={() => void submit()}
          >
            {t("actions.saveEvent")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
