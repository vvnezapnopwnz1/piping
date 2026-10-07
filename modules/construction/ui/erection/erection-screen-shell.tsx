"use client"

import { useTranslations } from "next-intl"
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { Skeleton } from "@/components/ui/skeleton"
import type { ErectionOperationId } from "./erection-operations"
import { FieldSpoolPicker } from "./field-spool-picker"
import type { ErectionReadinessState } from "./use-erection-readiness"

/**
 * True inside the erection workbench, which draws the one spool list and the spool's timeline
 * itself; the embedded screen then renders only its own operation.
 */
export const ErectionEmbeddedContext = createContext(false)

export interface ErectionOperationNavigation {
  openOperation: (id: ErectionOperationId) => void
  canOpenOperation: (id: ErectionOperationId) => boolean
}

export const ErectionOperationNavigationContext = createContext<ErectionOperationNavigation | null>(null)

export function useErectionOperationNavigation(): ErectionOperationNavigation | null {
  return useContext(ErectionOperationNavigationContext)
}

export interface ErectionCommands {
  pending: boolean
  run: (action: () => Promise<void>) => Promise<void>
}

export const ErectionCommandContext = createContext<ErectionCommands | null>(null)

export function useErectionCommands(): ErectionCommands {
  const shared = useContext(ErectionCommandContext)
  const lock = useRef(false)
  const [pending, setPending] = useState(false)
  const run = useCallback(async (action: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true
    setPending(true)
    try {
      await action()
    } finally {
      lock.current = false
      setPending(false)
    }
  }, [])
  return shared ?? { pending, run }
}

export function ErectionCommandProvider({ children }: { children: ReactNode }) {
  const commands = useErectionCommands()
  return <ErectionCommandContext.Provider value={commands}>{children}</ErectionCommandContext.Provider>
}

interface ErectionScreenShellProps {
  title: string
  description: string
  state: ErectionReadinessState
  commands?: ErectionCommands
  /** Rendered once a spool is selected. */
  children: (selected: NonNullable<ErectionReadinessState["selected"]>) => ReactNode
}

/**
 * The frame every erection screen shares: heading, spool picker, and the states where there is
 * nothing to render a form for. Each screen supplies only its own body.
 */
export function ErectionScreenShell({
  title,
  description,
  state,
  commands,
  children,
}: ErectionScreenShellProps) {
  const t = useTranslations("erection.shell")
  const { projectId, isLoading, loadFailed, rows, selected, select, canView } = state
  // Browsing for another spool has to take the body with it: everything a screen renders below is
  // about the spool being replaced.
  const [browsingSpools, setBrowsingSpools] = useState(false)
  const embedded = useContext(ErectionEmbeddedContext)
  const ownCommands = useErectionCommands()
  const activeCommands = commands ?? ownCommands

  if (embedded) {
    return selected ? (
      <ErectionCommandContext.Provider value={activeCommands}>
        <div className="space-y-4">{children(selected)}</div>
      </ErectionCommandContext.Provider>
    ) : null
  }

  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("selectAProjectToWork")}
      </p>
    )
  }

  if (!canView) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("viewingErectionProgressNeedsThe")}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>

      {/* Stacked, not side by side: the spool list is a table with a toolbar and a pagination
          footer now, and none of that fits a 20rem column. It folds to one line once a spool is
          picked, so the form below still gets the page. */}
      {loadFailed ? (
        <p className="text-destructive text-sm">
          {t("fieldSpoolsCouldNotBe")}
        </p>
      ) : (
        <FieldSpoolPicker
          rows={rows}
          value={selected?.spoolRevisionId ?? null}
          onChange={select}
          browsing={browsingSpools}
          onBrowsingChange={setBrowsingSpools}
          loading={isLoading}
        />
      )}

      {selected && !browsingSpools ? (
        <ErectionCommandContext.Provider value={activeCommands}>
          <div className="space-y-4">{children(selected)}</div>
        </ErectionCommandContext.Provider>
      ) : browsingSpools ? null : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <p className="text-muted-foreground text-sm">
          {loadFailed ? "" : t("selectAFieldSpoolTo")}
        </p>
      )}
    </div>
  )
}
