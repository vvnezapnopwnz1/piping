"use client"

import * as React from "react"
import { Download, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { buildBarcodeWorkbook } from "../application/export-barcode-workbook"
import { createLatestProjectLoader } from "../application/manage-tracking"
import type { TrackingWorklistRow } from "../domain/tracking"
import { loadTrackingWorklist } from "../infrastructure/supabase-tracking-repository"

export function TrackingBarcodeScreen({ projectId, projectCode }: { projectId: string; projectCode: string }) {
  const loader = React.useRef(createLatestProjectLoader<TrackingWorklistRow[]>())
  const [result, setResult] = React.useState<{ projectId: string; rows: TrackingWorklistRow[] } | null>(null)
  const [errorProjectId, setErrorProjectId] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [refreshToken, setRefreshToken] = React.useState(0)
  const [tableState, setTableState] = useTableUrlState({ namespace: "bc" })
  React.useEffect(() => {
    const requestLoader = loader.current
    void requestLoader.run(projectId, () => loadTrackingWorklist(getSupabaseBrowserClient(), projectId), (rows) => { setResult({ projectId, rows }); setSelected(new Set()); setErrorProjectId(null) }).catch(() => setErrorProjectId(projectId))
    return () => requestLoader.invalidate()
  }, [projectId, refreshToken])
  if (errorProjectId === projectId) return <Alert variant="destructive"><AlertTitle>Unable to load spool barcodes</AlertTitle><AlertDescription>Check project access and retry.</AlertDescription></Alert>
  if (!result || result.projectId !== projectId) return <Skeleton className="h-64 w-full" />
  const rows = result.rows
  const toggle = (spoolId: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(spoolId)) next.delete(spoolId)
      else next.add(spoolId)
      return next
    })

  /**
   * The selection drives the export, so it is a column rather than a row click: picking forty
   * spools for a label run is not the same gesture as opening one.
   */
  const barcodeColumns: ReadonlyArray<DataColumn<TrackingWorklistRow>> = [
    {
      id: "select",
      header: "Select",
      sortable: false,
      alwaysVisible: true,
      // Sorting on the flag brings the current selection to the top, which is how forty scattered
      // picks get checked before the export.
      value: (row) => selected.has(row.spoolId),
      filter: "boolean",
      headerClassName: "w-16",
      cell: (row) => (
        <Checkbox
          aria-label={`Select ${row.spoolNumber}`}
          checked={selected.has(row.spoolId)}
          onCheckedChange={() => toggle(row.spoolId)}
        />
      ),
    },
    { id: "spoolNumber", header: "Spool", value: (row) => row.spoolNumber, searchable: true, filter: "text", pinned: true, alwaysVisible: true, className: "font-mono text-xs" },
    { id: "isoNumber", header: "ISO", value: (row) => row.isoNumber, searchable: true, filter: "text", className: "font-mono text-xs" },
    { id: "pdsAreaCode", header: "Area", value: (row) => row.pdsAreaCode, searchable: true, filter: "select", cell: (row) => row.pdsAreaCode ?? "Not configured" },
    {
      id: "currentLocationCode",
      header: "Current location",
      value: (row) => (row.isInTransit ? "In transit" : (row.currentLocationCode ?? "Not scanned")),
      searchable: true,
      filter: "select",
    },
  ]

  const exportWorkbook = () => {
    const workbook = buildBarcodeWorkbook(projectCode, rows, selected)
    const arrayBuffer = workbook.bytes.slice().buffer as ArrayBuffer
    const url = URL.createObjectURL(new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = workbook.filename; anchor.click(); URL.revokeObjectURL(url)
  }
  return <div className="space-y-6 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Barcode Printing</h1><p className="text-sm text-muted-foreground">Export selected stable spool identities for external Zebra label software.</p></div><Button variant="outline" onClick={() => setRefreshToken((value) => value + 1)}><RefreshCw />Refresh</Button></div><Alert><AlertTitle>External printer workflow</AlertTitle><AlertDescription>PipeQC creates an XLSX workbook. Barcode value equals the stable spool number; printing and label layout are handled in Zebra software.</AlertDescription></Alert><Card><CardHeader><CardTitle>Spools</CardTitle><CardDescription>Select the project rows to include in the workbook.</CardDescription></CardHeader><CardContent className="space-y-4"><DataTable
      columns={barcodeColumns}
      rows={rows}
      state={tableState}
      onStateChange={setTableState}
      rowId={(row) => row.spoolId}
      searchPlaceholder="Search spool, ISO, area or location…"
      emptyTitle="No spools in this project scope."
      toolbarActions={
        <Button disabled={selected.size === 0} onClick={exportWorkbook}>
          <Download />Download XLSX ({selected.size})
        </Button>
      }
    /></CardContent></Card></div>
}
