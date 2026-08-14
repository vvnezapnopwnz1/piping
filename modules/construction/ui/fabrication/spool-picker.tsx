"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  loadFabricationSpoolPage,
  type FabricationSpoolCursor,
  type SpoolStatus,
} from "../../infrastructure/supabase-construction-repository"
import { RecordSelectTable } from "@/components/ui/data-table/record-select-table"
import { FABRICATION_SPOOL_COLUMNS } from "./spool-columns"

interface SpoolPickerProps {
  projectId: string
  value: string | null
  onChange: (status: SpoolStatus) => void
  /** True while the operator is back in the list; see `SpoolSelectTable`. */
  browsing: boolean
  onBrowsingChange: (browsing: boolean) => void
  refreshToken?: number
}

export function SpoolPicker({
  projectId,
  value,
  onChange,
  browsing,
  onBrowsingChange,
  refreshToken = 0,
}: SpoolPickerProps) {
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
        toast.error(error instanceof Error ? error.message : "Spools could not be loaded."),
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
      title="Spools"
      columns={FABRICATION_SPOOL_COLUMNS}
      rows={statuses}
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
      changeLabel="Change spool"
      searchPlaceholder="Search spool, ISO or stage…"
      emptyTitle="No spool is available on this project."
      emptyDescription="Spools appear once an engineering revision carrying them is accepted."
      selectedIdentity={(spool) => spool.spoolNumber}
      // The separator is in the text, not in CSS margin: without it the accessible name
      // concatenates to "AR1ISO-2201-14".
      selectedMeta={(spool) => `rev ${spool.revisionNumber} · ${spool.isoNumber}`}
    />
  )
}
