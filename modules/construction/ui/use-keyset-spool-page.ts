"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { errorDetail } from "@/i18n/format"

export interface KeysetPage<Row, Cursor> {
  rows: Row[]
  nextCursor: Cursor | null
  /** All rows matching the query, not just the loaded page. */
  totalCount: number
}

/**
 * Cursor navigation for a server-paged spool list. The caller owns the query; a different
 * project, query, page size or `resetKey` (a saved mutation, say) goes back to the first page.
 * Loading is derived from the identity of the page being shown, so a change gets its skeleton
 * at once instead of after an effect has set state.
 */
export function useKeysetSpoolPage<Row, Cursor, Query>({
  resetKey,
  query,
  pageSize,
  load,
  errorTitle,
}: {
  resetKey: string
  query: Query
  pageSize: number
  load: (cursor: Cursor | null, query: Query, pageSize: number) => Promise<KeysetPage<Row, Cursor>>
  errorTitle: string
}) {
  const navigationKey = `${resetKey}:${pageSize}:${JSON.stringify(query)}`
  const [navigation, setNavigation] = useState<{ key: string; pageIndex: number; cursorHistory: Cursor[] }>({
    key: "",
    pageIndex: 0,
    cursorHistory: [],
  })
  const pageIndex = navigation.key === navigationKey ? navigation.pageIndex : 0
  const cursorHistory = navigation.key === navigationKey ? navigation.cursorHistory : []
  const cursor = pageIndex === 0 ? null : (cursorHistory[pageIndex - 1] ?? null)

  const [page, setPage] = useState<{ rows: Row[]; nextCursor: Cursor | null; totalCount: number }>({
    rows: [],
    nextCursor: null,
    totalCount: 0,
  })
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const pageKey = `${navigationKey}:${cursor === null ? "first" : JSON.stringify(cursor)}`

  useEffect(() => {
    if (pageIndex > 0 && !cursor) return
    let cancelled = false
    void load(cursor, query, pageSize)
      .then((next) => {
        if (!cancelled) setPage(next)
      })
      .catch((error: unknown) => toast.error(errorTitle, { description: errorDetail(error) }))
      .finally(() => {
        if (!cancelled) setSettledKey(pageKey)
      })
    return () => {
      cancelled = true
    }
  }, [load, cursor, query, pageSize, pageIndex, pageKey, errorTitle])

  const goToNextPage = () => {
    if (!page.nextCursor) return
    setNavigation({
      key: navigationKey,
      pageIndex: pageIndex + 1,
      cursorHistory: [...cursorHistory.slice(0, pageIndex), page.nextCursor],
    })
  }

  const goToPreviousPage = () => {
    if (pageIndex === 0) return
    setNavigation({ key: navigationKey, pageIndex: pageIndex - 1, cursorHistory })
  }

  return {
    rows: page.rows,
    totalCount: page.totalCount,
    pageIndex,
    hasNextPage: page.nextCursor !== null,
    loading: settledKey !== pageKey,
    goToNextPage,
    goToPreviousPage,
  }
}
