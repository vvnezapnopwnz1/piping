"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
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
  const t = useTranslations("tracking")
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
  if (errorProjectId === projectId) return <Alert variant="destructive"><AlertTitle>{t("barcodes.loadError")}</AlertTitle><AlertDescription>{t("barcodes.loadErrorDescription")}</AlertDescription></Alert>
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
      header: t("barcodes.select"),
      sortable: false,
      alwaysVisible: true,
      // Sorting on the flag brings the current selection to the top, which is how forty scattered
      // picks get checked before the export.
      value: (row) => selected.has(row.spoolId),
      filter: "boolean",
      headerClassName: "w-16",
      cell: (row) => (
        <Checkbox
          aria-label={t("barcodes.selectSpool", { spoolNumber: row.spoolNumber })}
          checked={selected.has(row.spoolId)}
          onCheckedChange={() => toggle(row.spoolId)}
        />
      ),
    },
    { id: "spoolNumber", header: t("barcodes.spool"), value: (row) => row.spoolNumber, searchable: true, filter: "text", pinned: true, alwaysVisible: true, className: "font-mono text-xs" },
    { id: "isoNumber", header: t("barcodes.iso"), value: (row) => row.isoNumber, searchable: true, filter: "text", className: "font-mono text-xs" },
    { id: "pdsAreaCode", header: t("barcodes.area"), value: (row) => row.pdsAreaCode, searchable: true, filter: "select", cell: (row) => row.pdsAreaCode ?? t("notConfigured") },
    {
      id: "currentLocationCode",
      header: t("barcodes.currentLocation"),
      value: (row) => (row.isInTransit ? t("inTransit") : (row.currentLocationCode ?? t("notScanned"))),
      searchable: true,
      filter: "select",
    },
  ]

  const exportWorkbook = () => {
    const workbook = buildBarcodeWorkbook(projectCode, rows, selected, t)
    const arrayBuffer = workbook.bytes.slice().buffer as ArrayBuffer
    const url = URL.createObjectURL(new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = workbook.filename; anchor.click(); URL.revokeObjectURL(url)
  }
  return <div className="space-y-6 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">{t("barcodes.title")}</h1><p className="text-sm text-muted-foreground">{t("barcodes.description")}</p></div><Button variant="outline" onClick={() => setRefreshToken((value) => value + 1)}><RefreshCw />{t("actions.refresh")}</Button></div><Alert><AlertTitle>{t("barcodes.noticeTitle")}</AlertTitle><AlertDescription>{t("barcodes.noticeDescription")}</AlertDescription></Alert><Card><CardHeader><CardTitle>{t("barcodes.cardTitle")}</CardTitle><CardDescription>{t("barcodes.cardDescription")}</CardDescription></CardHeader><CardContent className="space-y-4"><DataTable
      columns={barcodeColumns}
      rows={rows}
      state={tableState}
      onStateChange={setTableState}
      rowId={(row) => row.spoolId}
      searchPlaceholder={t("barcodes.searchPlaceholder")}
      emptyTitle={t("barcodes.emptyTitle")}
      toolbarActions={
        <Button disabled={selected.size === 0} onClick={exportWorkbook}>
          <Download />{t("actions.downloadXlsx", { count: selected.size })}
        </Button>
      }
    /></CardContent></Card></div>
}
