"use client"

import { useTranslations } from "next-intl"
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"

import { errorDetail } from "@/i18n/format"
import { useNameWorkContext, useWorkContextParam } from "@/components/pipeqc/work-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import {
  loadErectionReadinessForProject,
  type ErectionReadiness,
} from "../../infrastructure/supabase-erection-repository"
import { selectErectionRow } from "./erection-selection"

export interface ErectionReadinessState {
  projectId: string | null
  /** True until the first read settles, so an empty list is not shown as "no spools". */
  isLoading: boolean
  /** A failed read leaves `rows` empty; without this the screen would claim there are none. */
  loadFailed: boolean
  /** True when the loaded projection matches the active project without error or pending refresh. */
  dataCurrent: boolean
  rows: ErectionReadiness[]
  selected: ErectionReadiness | null
  select: (
    row: ErectionReadiness | null,
    options?: {
      push?: boolean
      extra?: Record<string, string | null>
    },
  ) => void
  /** Re-reads the projection and keeps the current selection if it is still there. */
  refresh: () => Promise<void>
  canRecord: boolean
  canView: boolean
}

const Shared = createContext<ErectionReadinessState | null>(null)

/**
 * Lets the erection workbench load the projection once and hand it to the operation screens it
 * embeds, so a milestone recorded inside one of them moves the workbench's timeline as well.
 */
export function ErectionReadinessProvider({
  value,
  children,
}: {
  value: ErectionReadinessState
  children: ReactNode
}) {
  return createElement(Shared.Provider, { value }, children)
}

/**
 * Every erection screen needs the same three things: the readiness projection for the active
 * project, a selection within it, and the caller's erection capabilities. Loading that once
 * here is what keeps the individual screens down to their own form.
 */
export function useErectionReadiness(): ErectionReadinessState {
  const shared = useContext(Shared)
  const own = useOwnErectionReadiness(shared === null)
  return shared ?? own
}

function useOwnErectionReadiness(enabled: boolean): ErectionReadinessState {
  const t = useTranslations("erection.shared")
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null
  const canRecord = access?.can("erection.progress.record") ?? false
  const canView = access?.can("erection.view") ?? false

  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null)
  const [rows, setRows] = useState<ErectionReadiness[]>([])
  // The selected spool lives in the address bar, so it survives Back, reload and a move to the
  // next erection step, and a blocker link can hand a spool over. Nothing is selected unless the
  // operator or a link chose it.
  const [selectedId, setSelectedId] = useWorkContextParam("spool")
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setLocalSelectedId(null)
  }, [selectedId])

  const activeSelectedId = localSelectedId ?? selectedId
  const [isLoading, setIsLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const generationRef = useRef(0)

  const refresh = useCallback(async () => {
    if (!enabled || !canView) {
      setIsLoading(false)
      return
    }
    const currentGen = ++generationRef.current
    if (!projectId) {
      setLoadedProjectId(null)
      setRows([])
      setLoadFailed(false)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const next = await loadErectionReadinessForProject(getSupabaseBrowserClient(), projectId)
      if (generationRef.current !== currentGen) return
      setLoadedProjectId(projectId)
      setRows(next)
      setLoadFailed(false)
    } catch (error: unknown) {
      if (generationRef.current !== currentGen) return
      setLoadFailed(true)
      if (loadedProjectId !== projectId) {
        setRows([])
      }
      toast.error(
        t("erectionReadinessCouldNotBe"), { description: errorDetail(error) },
      )
      throw error
    } finally {
      if (generationRef.current === currentGen) {
        setIsLoading(false)
      }
    }
  }, [enabled, canView, projectId, loadedProjectId])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) {
        void refresh().catch(() => undefined)
      }
    })
    return () => {
      cancelled = true
    }
  }, [refresh])

  const visibleRows = useMemo(
    () => (projectId && loadedProjectId === projectId ? rows : []),
    [projectId, loadedProjectId, rows],
  )
  const selected = useMemo(
    () => selectErectionRow(visibleRows, projectId, activeSelectedId),
    [visibleRows, projectId, activeSelectedId],
  )
  useNameWorkContext("spool", selected?.spoolRevisionId, selected?.spoolNumber)

  const select = useCallback(
    (
      row: ErectionReadiness | null,
      options?: {
        push?: boolean
        extra?: Record<string, string | null>
      },
    ) => {
      setLocalSelectedId(row?.spoolRevisionId ?? null)
      setSelectedId(row?.spoolRevisionId ?? null, options)
    },
    [setSelectedId],
  )

  const dataCurrent = Boolean(
    projectId && loadedProjectId === projectId && !isLoading && !loadFailed,
  )

  return {
    projectId,
    isLoading,
    loadFailed,
    dataCurrent,
    rows: visibleRows,
    selected,
    select,
    refresh,
    canRecord,
    canView,
  }
}
