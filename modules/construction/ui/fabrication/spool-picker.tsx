"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadFabricationSpoolPage,
  type FabricationSpoolCursor,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"
import { RecordSelectTable } from "@/components/ui/data-table/record-select-table"
import { fabricationSpoolColumns } from "./spool-columns"

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
  const [navigation, setNavigation] = useState<{
    projectId: string
    pageIndex: number
    cursorHistory: FabricationSpoolCursor[]
  }>({ projectId, pageIndex: 0, cursorHistory: [] })
  const [nextCursor, setNextCursor] = useState<FabricationSpoolCursor | null>(null)
  const requestKey = `${projectId}:${refreshToken}`
  const pageIndex = navigation.projectId === projectId ? navigation.pageIndex : 0
  const cursorHistory = navigation.projectId === projectId ? navigation.cursorHistory : []
  const cursor = pageIndex === 0 ? null : cursorHistory[pageIndex - 1]
  const [pageSize, setPageSize] = useState(50)
  // A new project, a saved mutation, or a different cursor changes this identity. Loading is
  // derived from it, so navigation gets an immediate skeleton without synchronously setting state
  // from an effect.
  const pageKey = `${requestKey}:${pageSize}:${cursor?.spoolRevisionId ?? "first"}`
  const [loadedPageKey, setLoadedPageKey] = useState<string | null>(null)
  const loading = loadedPageKey !== pageKey

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
        toast.error(t("spoolsCouldNotBeLoaded"), { description: errorDetail(error) }),
      )
      // Settled, not succeeded: a failed load must stop showing a skeleton it will never replace.
      .finally(() => {
        if (cancelled) return
        setLoadedPageKey(pageKey)
      })
    return () => { cancelled = true }
  }, [projectId, pageIndex, cursor, pageKey, pageSize])

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
    <RecordSelectTable
      title={t("spools")}
      columns={columns}
      rows={
        selected && selected.spoolRevisionId === value && !statuses.some((row) => row.spoolRevisionId === value)
          ? [selected, ...statuses]
          : statuses
      }
      rowId={(spool) => spool.spoolRevisionId}
      selectedId={value}
      onSelect={onChange}
      browsing={browsing}
      onBrowsingChange={onBrowsingChange}
      loading={loading}
      serverPagination={{
        pageIndex,
        pageSize,
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
