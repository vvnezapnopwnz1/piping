"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useTableUrlState } from "@/components/ui/data-table"
import { CONSTRUCTION_STAGES } from "../../domain/construction-phase"
import {
  loadFabricationSpoolPage,
  loadFabricationSpoolStageFacets,
  type FabricationSpoolCursor,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"
import { RecordSelectTable } from "@/components/ui/data-table/record-select-table"
import { fabricationSpoolColumns } from "./spool-columns"
import {
  fabricationSpoolQueryFromTableState,
  type FabricationStageLabelMap,
} from "./fabrication-spool-query"

interface SpoolPickerProps {
  projectId: string
  value: string | null
  /**
   * The selected spool's status when the screen already has it. A spool handed over by a link
   * may sit beyond the loaded page; listing it keeps the picker folded on it.
   */
  selected?: SpoolStatus | null
  onChange: (status: SpoolStatus) => void
  /** True while the operator is back in the list; see `SpoolSelectTable`. */
  browsing: boolean
  onBrowsingChange: (browsing: boolean) => void
  refreshToken?: number
}

export function SpoolPicker({
  projectId,
  value,
  selected = null,
  onChange,
  browsing,
  onBrowsingChange,
  refreshToken = 0,
}: SpoolPickerProps) {
  const t = useTranslations("fabrication.spoolPicker")
  const tc = useTranslations("codes")
  const tcol = useTranslations("fabrication.columns")
  const columns = useMemo(() => fabricationSpoolColumns(tcol, tc), [tcol, tc])
  const [statuses, setStatuses] = useState<SpoolStatus[]>([])
  const [stageFacets, setStageFacets] = useState<Array<{ stage: SpoolStatus["currentStage"]; count: number }> | null>(null)
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
  const [navigation, setNavigation] = useState<{
    key: string
    pageIndex: number
    cursorHistory: FabricationSpoolCursor[]
  }>({ key: "", pageIndex: 0, cursorHistory: [] })
  const [nextCursor, setNextCursor] = useState<FabricationSpoolCursor | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = tableState.pageSize
  const navigationKey = `${projectId}:${refreshToken}:${pageSize}:${queryKey}`
  const pageIndex = navigation.key === navigationKey ? navigation.pageIndex : 0
  const cursorHistory = navigation.key === navigationKey ? navigation.cursorHistory : []
  const cursor = pageIndex === 0 ? null : cursorHistory[pageIndex - 1]
  // A new project, a saved mutation, or a different cursor changes this identity. Loading is
  // derived from it, so navigation gets an immediate skeleton without synchronously setting state
  // from an effect.
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
        toast.error(t("spoolsCouldNotBeLoaded"), { description: errorDetail(error) }),
      )
      // Settled, not succeeded: a failed load must stop showing a skeleton it will never replace.
      .finally(() => {
        if (cancelled) return
        setLoadedPageKey(pageKey)
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
        toast.error(t("spoolsCouldNotBeLoaded"), { description: errorDetail(error) }),
      )
    return () => { cancelled = true }
  }, [projectId, t])

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
    setTableState({ ...tableState, pageSize: nextPageSize, pageIndex: 0 })
    setNavigation({ key: "", pageIndex: 0, cursorHistory: [] })
  }

  return (
    <RecordSelectTable
      title={t("spools")}
      columns={columns}
      rows={
        !browsing && selected && selected.spoolRevisionId === value && !statuses.some((row) => row.spoolRevisionId === value)
          ? [selected, ...statuses]
          : statuses
      }
      rowId={(spool) => spool.spoolRevisionId}
      selectedId={value}
      onSelect={onChange}
      browsing={browsing}
      onBrowsingChange={onBrowsingChange}
      loading={loading}
      tableState={tableState}
      onTableStateChange={setTableState}
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
      namespace="spool"
      changeLabel={t("changeSpool")}
      searchPlaceholder={t("searchSpoolIsoOrStage")}
      emptyTitle={t("noSpoolIsAvailableOn")}
      emptyDescription={t("spoolsAppearOnceAnEngineering")}
      selectedIdentity={(spool) => spool.spoolNumber}
      // The separator is in the text, not in CSS margin: without it the accessible name
      // concatenates to "AR1ISO-2201-14".
      selectedMeta={(spool) => t("revIso", { rev: spool.revisionNumber, iso: spool.isoNumber })}
    />
  )
}
