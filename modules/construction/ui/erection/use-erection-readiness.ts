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
  loadErectionReadiness,
  type ErectionReadiness,
} from "../../infrastructure/supabase-erection-repository"

export interface ErectionReadinessState {
  projectId: string | null
  /** True while the selected spool is being read, so it is not shown as "not available". */
  isLoading: boolean
  /** A failed read leaves no spool; without this the screen would claim the link is wrong. */
  loadFailed: boolean
  /** True when the selected spool is the one read for the active project, with no read pending. */
  dataCurrent: boolean
  selected: ErectionReadiness | null
  select: (
    row: ErectionReadiness | null,
    options?: {
      push?: boolean
      extra?: Record<string, string | null>
    },
  ) => void
  /**
   * Re-reads the selected spool and tells the spool list to reload, because a milestone recorded
   * on one screen moves the stage badge that the list shows.
   */
  refresh: () => Promise<void>
  /** Changes with every `refresh`; a list that pages on its own reloads when it changes. */
  refreshToken: number
  canRecord: boolean
  canView: boolean
}

const Shared = createContext<ErectionReadinessState | null>(null)

/**
 * Lets the erection workbench read the selected spool once and hand it to the operation screens
 * it embeds, so a milestone recorded inside one of them moves the workbench's timeline as well.
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
 * Every erection screen needs the same things: the selected spool, the active project and the
 * caller's erection capabilities. Reading that once here keeps the individual screens down to
 * their own form. The spool list is not part of it: each list pages itself from the server.
 */
export function useErectionReadiness(): ErectionReadinessState {
  const shared = useContext(Shared)
  const own = useOwnErectionReadiness(shared === null)
  return shared ?? own
}

interface Resolved {
  id: string
  projectId: string
  row: ErectionReadiness | null
}

function useOwnErectionReadiness(enabled: boolean): ErectionReadinessState {
  const t = useTranslations("erection.shared")
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null
  const canRecord = access?.can("erection.progress.record") ?? false
  const canView = access?.can("erection.view") ?? false

  // The selected spool lives in the address bar, so it survives Back, reload and a move to the
  // next erection step, and a blocker link can hand a spool over. Nothing is selected unless the
  // operator or a link chose it.
  const [selectedId, setSelectedId] = useWorkContextParam("spool")
  const [resolved, setResolved] = useState<Resolved | null>(null)
  const [reading, setReading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const generationRef = useRef(0)

  const read = useCallback(
    async (id: string, forProjectId: string) => {
      const generation = ++generationRef.current
      setReading(true)
      try {
        const row = await loadErectionReadiness(getSupabaseBrowserClient(), id)
        if (generationRef.current !== generation) return
        // A spool of another project is "not available" here, as it is when the address is stale.
        setResolved({ id, projectId: forProjectId, row: row?.projectId === forProjectId ? row : null })
        setLoadFailed(false)
      } catch (error: unknown) {
        if (generationRef.current !== generation) return
        setLoadFailed(true)
        toast.error(t("erectionReadinessCouldNotBe"), { description: errorDetail(error) })
        throw error
      } finally {
        if (generationRef.current === generation) setReading(false)
      }
    },
    [t],
  )

  const wanted = enabled && canView && projectId && selectedId ? { id: selectedId, projectId } : null
  const alreadyResolved = wanted && resolved?.id === wanted.id && resolved.projectId === wanted.projectId

  useEffect(() => {
    if (!wanted || alreadyResolved) return
    void read(wanted.id, wanted.projectId).catch(() => undefined)
  }, [wanted?.id, wanted?.projectId, alreadyResolved, read])

  const selected = alreadyResolved ? resolved.row : null
  useNameWorkContext("spool", selected?.spoolRevisionId, selected?.spoolNumber)

  const select = useCallback(
    (
      row: ErectionReadiness | null,
      options?: {
        push?: boolean
        extra?: Record<string, string | null>
      },
    ) => {
      // The list already holds this row, so seed it instead of reading it again.
      if (row && projectId) setResolved({ id: row.spoolRevisionId, projectId, row })
      setSelectedId(row?.spoolRevisionId ?? null, options)
    },
    [projectId, setSelectedId],
  )

  const refresh = useCallback(async () => {
    setRefreshToken((token) => token + 1)
    if (!enabled || !canView || !projectId || !selectedId) return
    await read(selectedId, projectId)
  }, [enabled, canView, projectId, selectedId, read])

  const resolving = Boolean(wanted) && !alreadyResolved
  const isLoading = resolving || reading
  const dataCurrent = Boolean(projectId && !isLoading && !loadFailed && (!wanted || alreadyResolved))

  return useMemo(
    () => ({
      projectId,
      isLoading,
      loadFailed,
      dataCurrent,
      selected,
      select,
      refresh,
      refreshToken,
      canRecord,
      canView,
    }),
    [projectId, isLoading, loadFailed, dataCurrent, selected, select, refresh, refreshToken, canRecord, canView],
  )
}
