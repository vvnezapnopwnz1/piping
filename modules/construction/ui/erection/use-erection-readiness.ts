"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import {
  loadErectionReadinessForProject,
  type ErectionReadiness,
} from "../../infrastructure/supabase-erection-repository"

export interface ErectionReadinessState {
  projectId: string | null
  /** True until the first read settles, so an empty list is not shown as "no spools". */
  isLoading: boolean
  /** A failed read leaves `rows` empty; without this the screen would claim there are none. */
  loadFailed: boolean
  rows: ErectionReadiness[]
  selected: ErectionReadiness | null
  select: (row: ErectionReadiness) => void
  /** Re-reads the projection and keeps the current selection if it is still there. */
  refresh: () => Promise<void>
  canRecord: boolean
  canView: boolean
}

/**
 * Every erection screen needs the same three things: the readiness projection for the active
 * project, a selection within it, and the caller's erection capabilities. Loading that once
 * here is what keeps the individual screens down to their own form.
 */
export function useErectionReadiness(): ErectionReadinessState {
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null
  const canRecord = access?.can("erection.progress.record") ?? false
  const canView = access?.can("erection.view") ?? false

  const [rows, setRows] = useState<ErectionReadiness[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const refresh = useCallback(async () => {
    if (!projectId) {
      setRows([])
      setIsLoading(false)
      return
    }
    try {
      const next = await loadErectionReadinessForProject(getSupabaseBrowserClient(), projectId)
      setLoadFailed(false)
      setRows(next)
      // Keep the selection if the refresh still carries it, otherwise nothing. Falling back to
      // the first row opened every erection screen with a form already pointed at a spool the
      // operator never chose — and since both phases list the same project in the same order,
      // that first row is usually whatever they had open in fabrication, which reads as state
      // leaking between modules. It is not: it is this line.
      setSelectedId((current) =>
        current && next.some((row) => row.spoolRevisionId === current) ? current : null,
      )
    } catch (error: unknown) {
      setLoadFailed(true)
      setRows([])
      toast.error(
        error instanceof Error ? error.message : "Erection readiness could not be loaded.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  const selected = useMemo(
    () => rows.find((row) => row.spoolRevisionId === selectedId) ?? null,
    [rows, selectedId],
  )

  const select = useCallback((row: ErectionReadiness) => {
    setSelectedId(row.spoolRevisionId)
  }, [])

  return {
    projectId,
    isLoading,
    loadFailed,
    rows,
    selected,
    select,
    refresh,
    canRecord,
    canView,
  }
}
