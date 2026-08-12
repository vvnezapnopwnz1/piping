"use client"

import * as React from "react"
import { Download, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { buildBarcodeWorkbook } from "../application/export-barcode-workbook"
import { createLatestProjectLoader } from "../application/manage-tracking"
import type { TrackingWorklistRow } from "../domain/tracking"
import { loadTrackingWorklist } from "../infrastructure/supabase-tracking-repository"
import { filterTrackingWorklist } from "./tracking-screen-model"

export function TrackingBarcodeScreen({ projectId, projectCode }: { projectId: string; projectCode: string }) {
  const loader = React.useRef(createLatestProjectLoader<TrackingWorklistRow[]>())
  const [result, setResult] = React.useState<{ projectId: string; rows: TrackingWorklistRow[] } | null>(null)
  const [errorProjectId, setErrorProjectId] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [refreshToken, setRefreshToken] = React.useState(0)
  React.useEffect(() => {
    const requestLoader = loader.current
    void requestLoader.run(projectId, () => loadTrackingWorklist(getSupabaseBrowserClient(), projectId), (rows) => { setResult({ projectId, rows }); setSelected(new Set()); setErrorProjectId(null) }).catch(() => setErrorProjectId(projectId))
    return () => requestLoader.invalidate()
  }, [projectId, refreshToken])
  if (errorProjectId === projectId) return <Alert variant="destructive"><AlertTitle>Unable to load spool barcodes</AlertTitle><AlertDescription>Check project access and retry.</AlertDescription></Alert>
  if (!result || result.projectId !== projectId) return <Skeleton className="h-64 w-full" />
  const rows = result.rows
  const filtered = filterTrackingWorklist(rows, query)
  const exportWorkbook = () => {
    const workbook = buildBarcodeWorkbook(projectCode, rows, selected)
    const arrayBuffer = workbook.bytes.slice().buffer as ArrayBuffer
    const url = URL.createObjectURL(new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = workbook.filename; anchor.click(); URL.revokeObjectURL(url)
  }
  return <div className="space-y-6 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Barcode Printing</h1><p className="text-sm text-muted-foreground">Export selected stable spool identities for external Zebra label software.</p></div><Button variant="outline" onClick={() => setRefreshToken((value) => value + 1)}><RefreshCw />Refresh</Button></div><Alert><AlertTitle>External printer workflow</AlertTitle><AlertDescription>PipeQC creates an XLSX workbook. Barcode value equals the stable spool number; printing and label layout are handled in Zebra software.</AlertDescription></Alert><Card><CardHeader><CardTitle>Spools</CardTitle><CardDescription>Select the project rows to include in the workbook.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Input aria-label="Filter barcode spools" className="max-w-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter spool, ISO, area or location" /><Button disabled={selected.size === 0} onClick={exportWorkbook}><Download />Download XLSX ({selected.size})</Button></div><Table><TableHeader><TableRow><TableHead>Select</TableHead><TableHead>Spool</TableHead><TableHead>ISO</TableHead><TableHead>Area</TableHead><TableHead>Current location</TableHead></TableRow></TableHeader><TableBody>{filtered.length === 0 ? <TableRow><TableCell colSpan={5}>No spools match this filter.</TableCell></TableRow> : filtered.map((row) => <TableRow key={row.spoolId}><TableCell><input aria-label={`Select ${row.spoolNumber}`} type="checkbox" checked={selected.has(row.spoolId)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(row.spoolId); else next.delete(row.spoolId); return next })} /></TableCell><TableCell>{row.spoolNumber}</TableCell><TableCell>{row.isoNumber}</TableCell><TableCell>{row.pdsAreaCode ?? "Not configured"}</TableCell><TableCell>{row.isInTransit ? "In transit" : row.currentLocationCode ?? "Not scanned"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>
}
