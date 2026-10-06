"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { WorkContextKey } from "@/config/navigation"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { useRequestLeave } from "./unsaved-input-guard"

import {
  EMPTY_WORK_CONTEXT,
  WORK_CONTEXT_PARAMS,
  getVisibleAreas,
  locate,
  readWorkContext,
  safeReturnPath,
  type VisibleArea,
  type WorkContext,
} from "./workspace-model"

interface Remembered {
  id: string
  label: string | null
}

type Memory = Record<WorkContextKey, Remembered | null>

const EMPTY_MEMORY: Memory = { spool: null, testPack: null }
const KEYS: readonly WorkContextKey[] = ["spool", "testPack"]

interface WorkContextValue {
  areas: VisibleArea[]
  /** The selected objects, as links should carry them. */
  context: WorkContext
  labels: Record<WorkContextKey, string | null>
  /** A safe in-app path this page was opened from, for "Back to …". */
  from: string | null
  /** A screen that knows the object's human name reports it here, for the context chip. */
  name: (key: WorkContextKey, id: string, label: string) => void
  /** Forget the object and drop it from the address bar. */
  clear: (key: WorkContextKey) => void
}

const Context = React.createContext<WorkContextValue | null>(null)

/**
 * The spool or test pack the user is working on travels with them between pages, the way the
 * prototype's object chip did. The address bar is the authority on a page that applies the
 * object, so Back, Forward, reload and pasted links all restore it; elsewhere it is remembered
 * for the current project only, so a later page that applies it can pick it up again.
 */
export function WorkContextProvider({ children }: { children: React.ReactNode }) {
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null
  const can = access?.can
  const pathname = usePathname()
  const params = useSearchParams()
  const router = useRouter()
  const areas = React.useMemo(() => (can ? getVisibleAreas(can) : []), [can])
  const page = locate(pathname, areas)?.page ?? null
  const fromUrl = readWorkContext(new URLSearchParams(params.toString()))
  const spoolInUrl = fromUrl.spool
  const testPackInUrl = fromUrl.testPack

  const [memory, setMemory] = React.useState<{ projectId: string | null; value: Memory }>({
    projectId,
    value: EMPTY_MEMORY,
  })
  // A different project starts with nothing selected: an object id never crosses projects.
  const remembered = memory.projectId === projectId ? memory.value : EMPTY_MEMORY

  const context = React.useMemo<WorkContext>(() => {
    const next = { ...EMPTY_WORK_CONTEXT }
    const inAddress: WorkContext = { spool: spoolInUrl, testPack: testPackInUrl }
    for (const key of KEYS) {
      const inUrl = inAddress[key]
      // A page that applies the object and was opened without it is showing everything on purpose.
      next[key] = inUrl ?? (page?.context?.includes(key) ? null : (remembered[key]?.id ?? null))
    }
    return next
  }, [spoolInUrl, testPackInUrl, page, remembered])

  React.useEffect(() => {
    setMemory((current) => {
      const base = current.projectId === projectId ? current.value : EMPTY_MEMORY
      const value = { ...base }
      for (const key of KEYS) {
        const id = context[key]
        value[key] = id ? { id, label: base[key]?.id === id ? base[key].label : null } : null
      }
      const same =
        current.projectId === projectId &&
        KEYS.every(
          (key) =>
            current.value[key]?.id === value[key]?.id &&
            current.value[key]?.label === value[key]?.label,
        )
      return same ? current : { projectId, value }
    })
  }, [context, projectId])

  const name = React.useCallback(
    (key: WorkContextKey, id: string, label: string) => {
      setMemory((current) => {
        const base = current.projectId === projectId ? current.value : EMPTY_MEMORY
        if (base[key]?.id === id && base[key]?.label === label) return current
        return { projectId, value: { ...base, [key]: { id, label } } }
      })
    },
    [projectId],
  )

  const requestLeave = useRequestLeave()

  const clear = React.useCallback(
    (key: WorkContextKey) => {
      requestLeave(() => {
        setMemory((current) => ({
          projectId,
          value: { ...(current.projectId === projectId ? current.value : EMPTY_MEMORY), [key]: null },
        }))
        const next = new URLSearchParams(window.location.search)
        if (next.has(WORK_CONTEXT_PARAMS[key])) {
          next.delete(WORK_CONTEXT_PARAMS[key])
          const query = next.toString()
          router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
        }
      })
    },
    [pathname, projectId, requestLeave, router],
  )

  const labels = React.useMemo(
    () => ({
      spool: context.spool && remembered.spool?.id === context.spool ? remembered.spool.label : null,
      testPack:
        context.testPack && remembered.testPack?.id === context.testPack
          ? remembered.testPack.label
          : null,
    }),
    [context, remembered],
  )

  const from = safeReturnPath(params.get("from"))
  const value = React.useMemo(
    () => ({ areas, context, labels, from, name, clear }),
    [areas, context, labels, from, name, clear],
  )
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useWorkContext(): WorkContextValue | null {
  return React.useContext(Context)
}

/**
 * The selected object of one kind as the current page sees it in the address bar, and a setter
 * that records a new choice there. By default the choice replaces the entry: picking a different
 * spool changes what the page shows. Opening an object where none was open can `push` instead,
 * so Back closes it again.
 */
export function useWorkContextParam(
  key: WorkContextKey,
): [string | null, (id: string | null, options?: { push?: boolean; extra?: Record<string, string | null> }) => void] {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const param = WORK_CONTEXT_PARAMS[key]
  const value = params.get(param) || null
  const set = React.useCallback(
    (id: string | null, options?: { push?: boolean; extra?: Record<string, string | null> }) => {
      const next = new URLSearchParams(window.location.search)
      const before = next.toString()
      if (id) next.set(param, id)
      else next.delete(param)
      for (const [name, extra] of Object.entries(options?.extra ?? {})) {
        if (extra) next.set(name, extra)
        else next.delete(name)
      }
      const query = next.toString()
      if (query === before) return
      const href = query ? `${pathname}?${query}` : pathname
      if (options?.push) router.push(href, { scroll: false })
      else router.replace(href, { scroll: false })
    },
    [param, pathname, router],
  )
  return [value, set]
}

/** Reports the human name of the object a screen has resolved, so the chip can show it. */
export function useNameWorkContext(key: WorkContextKey, id: string | null | undefined, label: string | null | undefined) {
  const context = useWorkContext()
  const name = context?.name
  React.useEffect(() => {
    if (name && id && label) name(key, id, label)
  }, [id, key, label, name])
}
