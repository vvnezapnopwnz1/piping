"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, useTableUrlState } from "@/components/ui/data-table"
import { FABRICATION_SPOOL_COLUMNS } from "./spool-columns"
import { FabricationChartsPanel } from "./fabrication-charts-panel"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { CONSTRUCTION_STAGES, stageLabel } from "../../domain/construction-phase"
import {
  loadFabricationSpoolPage,
  loadFabricationChartData,
  loadFabricationSpoolStageCounts,
  type FabricationChartData,
  type FabricationSpoolCursor,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"

/**
 * The cards are an aggregate of the projection, while the worklist is a separate cursor page.
 * Neither query scans every spool into the browser.
 */
export function FabricationOverview({ projectId }: { projectId: string }) {
  const [statuses, setStatuses] = useState<SpoolStatus[]>([])
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [charts, setCharts] = useState<FabricationChartData | null>(null)
  const [chartsLoadedProjectId, setChartsLoadedProjectId] = useState<string | null>(null)
  const [navigation, setNavigation] = useState<{
    projectId: string
    pageIndex: number
    cursorHistory: FabricationSpoolCursor[]
  }>({ projectId, pageIndex: 0, cursorHistory: [] })
  const [nextCursor, setNextCursor] = useState<FabricationSpoolCursor | null>(null)
  const pageIndex = navigation.projectId === projectId ? navigation.pageIndex : 0
  const cursorHistory = navigation.projectId === projectId ? navigation.cursorHistory : []
  const cursor = pageIndex === 0 ? null : cursorHistory[pageIndex - 1]
  const [pageSize, setPageSize] = useState(50)
  const pageKey = `${projectId}:${pageSize}:${cursor?.spoolRevisionId ?? "first"}`
  const [loadedPageKey, setLoadedPageKey] = useState<string | null>(null)
  const loading = loadedPageKey !== pageKey
  const [tableState, setTableState] = useTableUrlState({ namespace: "spool" })

  useEffect(() => {
    if (pageIndex > 0 && !cursor) return
    let cancelled = false
    void loadFabricationSpoolPage(getSupabaseBrowserClient(), projectId, cursor, null, pageSize)
      .then((page) => {
        if (cancelled) return
        setStatuses(page.rows)
        setNextCursor(page.nextCursor)
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "The overview could not be loaded."),
      )
      .finally(() => {
        if (!cancelled) setLoadedPageKey(pageKey)
      })
    return () => { cancelled = true }
  }, [projectId, pageIndex, cursor, pageKey, pageSize])

  useEffect(() => {
    void loadFabricationSpoolStageCounts(getSupabaseBrowserClient(), projectId)
      .then(setCounts)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "The fabrication totals could not be loaded."),
      )
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    void loadFabricationChartData(getSupabaseBrowserClient(), projectId)
      .then((data) => {
        if (!cancelled) setCharts(data)
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "The fabrication charts could not be loaded."),
      )
      .finally(() => {
        if (!cancelled) setChartsLoadedProjectId(projectId)
      })
    return () => { cancelled = true }
  }, [projectId])

  const goToNextPage = () => {
    if (!nextCursor) return
    setNavigation({
      projectId,
      pageIndex: pageIndex + 1,
      cursorHistory: [...cursorHistory.slice(0, pageIndex), nextCursor],
    })
  }

  const goToPreviousPage = () => {
    if (pageIndex === 0) return
    setNavigation({ projectId, pageIndex: pageIndex - 1, cursorHistory })
  }

  const changePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize)
    setNavigation({ projectId, pageIndex: 0, cursorHistory: [] })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {["not_started", ...CONSTRUCTION_STAGES].map((stage) => (
          <Card key={stage}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stage === "not_started"
                  ? "Not started"
                  : stageLabel(stage as (typeof CONSTRUCTION_STAGES)[number])}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {counts.get(stage) ?? 0}
            </CardContent>
          </Card>
        ))}
      </div>

      <FabricationChartsPanel
        data={charts}
        loading={chartsLoadedProjectId !== projectId}
      />

      <Card>
        <CardHeader>
          <CardTitle>Spools</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={FABRICATION_SPOOL_COLUMNS}
            rows={statuses}
            state={tableState}
            onStateChange={setTableState}
            rowId={(status) => status.spoolRevisionId}
            loading={loading}
            serverPagination={{
              pageIndex,
              pageSize,
              hasNextPage: nextCursor !== null,
              onPreviousPage: goToPreviousPage,
              onNextPage: goToNextPage,
              onPageSizeChange: changePageSize,
            }}
            searchPlaceholder="Search this batch by spool or ISO…"
            emptyTitle="No spool is available on this project."
            emptyDescription="Spools appear once an engineering revision carrying them is accepted."
          />
        </CardContent>
      </Card>
    </div>
  )
}
