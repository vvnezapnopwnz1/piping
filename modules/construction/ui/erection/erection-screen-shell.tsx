"use client"

import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FieldSpoolPicker } from "./field-spool-picker"
import type { ErectionReadinessState } from "./use-erection-readiness"

interface ErectionScreenShellProps {
  title: string
  description: string
  state: ErectionReadinessState
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
  children,
}: ErectionScreenShellProps) {
  const { projectId, isLoading, loadFailed, rows, selected, select, canView } = state

  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">
        Select a project to work on erection progress.
      </p>
    )
  }

  if (!canView) {
    return (
      <p className="text-muted-foreground text-sm">
        Viewing erection progress needs the erection.view capability on this project.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Field spools</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-1">
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-full" />
              </div>
            ) : loadFailed ? (
              <p className="text-destructive text-sm">
                Field spools could not be loaded, so none are listed and nothing has been
                changed. Reload the page, and report this if it persists.
              </p>
            ) : (
              <FieldSpoolPicker
                rows={rows}
                value={selected?.spoolRevisionId ?? null}
                onChange={select}
              />
            )}
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-4">{children(selected)}</div>
        ) : isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <p className="text-muted-foreground text-sm">
            {loadFailed ? "" : "Select a field spool to record erection progress against it."}
          </p>
        )}
      </div>
    </div>
  )
}
