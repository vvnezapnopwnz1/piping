"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { errorDetail } from "@/i18n/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, useTableUrlState } from "@/components/ui/data-table"
import { fabricationSpoolColumns } from "./spool-columns"
import { FabricationChartsPanel } from "./fabrication-charts-panel"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { CONSTRUCTION_STAGES } from "../../domain/construction-phase"
import {
  loadFabricationSpoolPage,
  loadFabricationSpoolStageFacets,
  loadFabricationChartData,
  loadFabricationSpoolStageCounts,
  type FabricationChartData,
  type FabricationSpoolCursor,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"
import {
  fabricationSpoolQueryFromTableState,
  type FabricationStageLabelMap,
} from "./fabrication-spool-query"

/**
 * The cards are an aggregate of the projection, while the worklist is a separate cursor page.
 * Neither query scans every spool into the browser.
 */
export function FabricationOverview({ projectId }: { projectId: string }) {
  const t = useTranslations("fabrication.overview")
  const tc = useTranslations("codes")
  const tcol = useTranslations("fabrication.columns")
  const columns = useMemo(() => fabricationSpoolColumns(tcol, tc), [tcol, tc])
  const [statuses, setStatuses] = useState<SpoolStatus[]>([])
  const [stageFacets, setStageFacets] = useState<Array<{ stage: SpoolStatus["currentStage"]; count: number }> | null>(null)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [charts, setCharts] = useState<FabricationChartData | null>(null)
  const [chartsLoadedProjectId, setChartsLoadedProjectId] = useState<string | null>(null)
  const [navigation, setNavigation] = useState<{
    key: string
    pageIndex: number
    cursorHistory: FabricationSpoolCursor[]
  }>({ key: "", pageIndex: 0, cursorHistory: [] })
  const [nextCursor, setNextCursor] = useState<FabricationSpoolCursor | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [tableState, setTableState] = useTableUrlState({ namespace: "spool" })
  const stageLabels = useMemo<FabricationStageLabelMap>(() => Object.fromEntries([
    [tc("fabricationStage.not_started"), null],
    ...CONSTRUCTION_STAGES.map((stage) => [tc(`fabricationStage.${stage}`), stage]),
  ]), [tc])
  const query = useMemo(
    () => fabricationSpoolQueryFromTableState(tableState, stageLabels),
    [tableState, stageLabels],
  )
  const queryKey = JSON.stringify(query)
  const navigationKey = `${projectId}:${pageSize}:${queryKey}`
  const pageIndex = navigation.key === navigationKey ? navigation.pageIndex : 0
  const cursorHistory = navigation.key === navigationKey ? navigation.cursorHistory : []
  const cursor = pageIndex === 0 ? null : cursorHistory[pageIndex - 1]
  const pageKey = `${navigationKey}:${cursor?.spoolRevisionId ?? "first"}`
  const [loadedPageKey, setLoadedPageKey] = useState<string | null>(null)
  const loading = loadedPageKey !== pageKey

  useEffect(() => {
    if (pageIndex > 0 && !cursor) return
    let cancelled = false
    void loadFabricationSpoolPage(getSupabaseBrowserClient(), projectId, cursor, query, pageSize)
      .then((page) => {
        if (cancelled) return
        setStatuses(page.rows)
        setNextCursor(page.nextCursor)
        setTotalCount(page.totalCount)
      })
      .catch((error: unknown) =>
        toast.error(t("theOverviewCouldNotBe"), { description: errorDetail(error) }),
      )
      .finally(() => {
        if (!cancelled) setLoadedPageKey(pageKey)
      })
    return () => { cancelled = true }
  }, [projectId, pageIndex, cursor, pageKey, pageSize, query, t])

  useEffect(() => {
    let cancelled = false
    void loadFabricationSpoolStageFacets(getSupabaseBrowserClient(), projectId)
      .then((facets) => {
        if (!cancelled) setStageFacets(facets)
      })
      .catch((error: unknown) =>
        toast.error(t("theOverviewCouldNotBe"), { description: errorDetail(error) }),
      )
    return () => { cancelled = true }
  }, [projectId, t])

  useEffect(() => {
    void loadFabricationSpoolStageCounts(getSupabaseBrowserClient(), projectId)
      .then(setCounts)
      .catch((error: unknown) =>
        toast.error(t("theFabricationTotalsCouldNot"), { description: errorDetail(error) }),
      )
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    void loadFabricationChartData(getSupabaseBrowserClient(), projectId)
      .then((data) => {
        if (!cancelled) setCharts(data)
      })
      .catch((error: unknown) =>
        toast.error(t("theFabricationChartsCouldNot"), { description: errorDetail(error) }),
      )
      .finally(() => {
        if (!cancelled) setChartsLoadedProjectId(projectId)
      })
    return () => { cancelled = true }
  }, [projectId])

  const goToNextPage = () => {
    if (!nextCursor) return
    setNavigation({
      key: navigationKey,
      pageIndex: pageIndex + 1,
      cursorHistory: [...cursorHistory.slice(0, pageIndex), nextCursor],
    })
  }

  const goToPreviousPage = () => {
    if (pageIndex === 0) return
    setNavigation({ key: navigationKey, pageIndex: pageIndex - 1, cursorHistory })
  }

  const changePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize)
    setNavigation({ key: "", pageIndex: 0, cursorHistory: [] })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {["not_started", ...CONSTRUCTION_STAGES].map((stage) => (
          <Card key={stage}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {tc(`fabricationStage.${stage as (typeof CONSTRUCTION_STAGES)[number] | "not_started"}`)}
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
          <CardTitle>{t("spools")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={statuses}
            state={tableState}
            onStateChange={setTableState}
            rowId={(status) => status.spoolRevisionId}
            loading={loading}
            serverQuery
            multiSort={false}
            hideSelectedFacetCounts
            serverFacets={{
              currentStage: (stageFacets ?? [])
                .map((facet) => [tc(`fabricationStage.${facet.stage ?? "not_started"}`), facet.count]),
            }}
            serverPagination={{
              pageIndex,
              pageSize,
              totalCount,
              overallCount: stageFacets?.reduce((sum, facet) => sum + facet.count, 0),
              hasNextPage: nextCursor !== null,
              onPreviousPage: goToPreviousPage,
              onNextPage: goToNextPage,
              onPageSizeChange: changePageSize,
            }}
            searchPlaceholder={t("searchThisBatchBySpool")}
            emptyTitle={t("noSpoolIsAvailableOn")}
            emptyDescription={t("spoolsAppearOnceAnEngineering")}
          />
        </CardContent>
      </Card>
    </div>
  )
}
