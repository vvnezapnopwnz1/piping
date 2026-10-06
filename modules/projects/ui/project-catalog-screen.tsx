"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { withProject } from "@/components/pipeqc/project-url"
import { Skeleton } from "@/components/ui/skeleton"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  resolveProjectToOpen,
  type ProjectCatalogMetadata,
} from "../domain/project-catalog"
import { loadProjectCatalogMetadata } from "../infrastructure/supabase-project-catalog"
import { ProjectCatalogView } from "./project-catalog-view"
import styles from "./project-catalog.module.css"

export function ProjectCatalogScreen() {
  const { user, projectAccesses, access, selectProject } = useSupabaseAuth()
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [attempt, setAttempt] = React.useState(0)
  const ids = React.useMemo(
    () => projectAccesses.map((project) => project.projectId),
    [projectAccesses],
  )
  const scope = `${user?.id ?? ""}:${ids.join(",")}`
  const [result, setResult] = React.useState<{
    scope: string
    attempt: number
    status: "ready" | "error"
    rows: ProjectCatalogMetadata[]
  } | null>(null)

  React.useEffect(() => {
    if (!ids.length) return
    let cancelled = false
    void Promise.resolve()
      .then(() => loadProjectCatalogMetadata(getSupabaseBrowserClient(), ids))
      .then(
        (rows) => {
          if (!cancelled) setResult({ scope, attempt, status: "ready", rows })
        },
        () => {
          if (!cancelled)
            setResult({ scope, attempt, status: "error", rows: [] })
        },
      )
    return () => {
      cancelled = true
    }
  }, [attempt, ids, scope])

  // Navigate only after the provider has committed the selected project and its scope.
  React.useEffect(() => {
    if (
      pendingId &&
      access?.projectId === pendingId &&
      resolveProjectToOpen(projectAccesses, pendingId)
    )
      router.push(withProject("/", access.activityCode))
  }, [access?.activityCode, access?.projectId, pendingId, projectAccesses, router])

  const current =
    result?.scope === scope && result.attempt === attempt ? result : null
  return (
    <main id="main-content" className={styles.catalog}>
      <ProjectCatalogView
        projects={projectAccesses}
        metadata={current?.rows ?? []}
        detailsState={!ids.length ? "ready" : (current?.status ?? "loading")}
        detailsLoading={
          <div aria-hidden="true" className="space-y-3">
            <Skeleton className="h-3.5 w-3/4 motion-reduce:animate-none" />
            <Skeleton className="h-3.5 w-2/3 motion-reduce:animate-none" />
            <Skeleton className="h-3.5 w-1/2 motion-reduce:animate-none" />
          </div>
        }
        selectedId={access?.projectId ?? null}
        pendingId={pendingId}
        query={query}
        onQuery={setQuery}
        onRetry={() => setAttempt((value) => value + 1)}
        onOpen={(id) => {
          // Returning keeps the open project; there is nothing to switch.
          if (access && id === access.projectId) {
            router.push(withProject("/", access.activityCode))
            return
          }
          const project = resolveProjectToOpen(projectAccesses, id)
          if (!project || pendingId) return
          setPendingId(project.projectId)
          selectProject(project.projectId)
        }}
      />
    </main>
  )
}
