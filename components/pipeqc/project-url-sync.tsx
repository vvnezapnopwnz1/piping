"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { useSupabaseAuth } from "@/contexts/supabase-auth-context"

import { PROJECT_PARAM, resolveRequestedProject } from "./project-url"

/**
 * Keeps the selected project in the address bar as `?p=<code>`. Every page link inside the
 * workspace is project-relative, so the code is written onto whatever page is open; a link,
 * reload or Back that arrives with a different code switches to that project, as long as the
 * user may open it. Without this a Back across a project switch showed the old page with the
 * new project's data.
 */
export function ProjectUrlSync() {
  const { access, projectAccesses, selectProject } = useSupabaseAuth()
  const pathname = usePathname()
  const params = useSearchParams()
  const requested = params.get(PROJECT_PARAM)
  const current = access?.activityCode ?? null
  const currentId = access?.projectId ?? null
  const reported = React.useRef<string | null>(null)

  // The remembered "last project" is shared by every tab and history entry. When this page comes
  // back into view — a restored history entry, another tab handing focus back — it becomes the
  // last project again, so the next plain visit opens what the user was actually looking at.
  React.useEffect(() => {
    if (!currentId || !current) return
    const remember = (event: Event) => {
      if (event.type === "pageshow" && !(event as PageTransitionEvent).persisted) return
      // Only once the page and the address agree: mid-switch, the open project is about to change.
      if (new URLSearchParams(window.location.search).get(PROJECT_PARAM) !== current) return
      selectProject(currentId)
    }
    window.addEventListener("pageshow", remember)
    window.addEventListener("focus", remember)
    return () => {
      window.removeEventListener("pageshow", remember)
      window.removeEventListener("focus", remember)
    }
  }, [current, currentId, selectProject])

  React.useEffect(() => {
    if (!current) return
    const decision = resolveRequestedProject(requested, current, projectAccesses)
    // Reported on the next tick: on a fresh load this runs before the toaster has subscribed.
    if (decision.kind === "switch") {
      selectProject(decision.project.projectId)
      const code = decision.project.activityCode
      window.setTimeout(() => toast.info(`Opened project ${code} from the address.`), 0)
      return
    }
    if (decision.kind === "unavailable" && reported.current !== requested) {
      reported.current = requested
      window.setTimeout(
        () => toast.error(`Project ${requested} is not available to your account, so ${current} stays open.`),
        0,
      )
    }
    const url = new URL(window.location.href)
    if (url.searchParams.get(PROJECT_PARAM) === current) return
    url.searchParams.set(PROJECT_PARAM, current)
    // Next.js keeps native replaceState in step with its router, so useSearchParams sees it
    // without a navigation, and nothing on the page remounts.
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
  }, [current, pathname, projectAccesses, requested, selectProject])

  return null
}

/**
 * Holds the page back while the address names another project the user may open and the switch
 * to it is still in flight (a Back across a project change). A screen mounted in between would
 * load the old project's records and could drop a selection that belongs to the new one.
 */
export function ProjectUrlGate({ children }: { children: React.ReactNode }) {
  const { access, projectAccesses } = useSupabaseAuth()
  const requested = useSearchParams().get(PROJECT_PARAM)
  const current = access?.activityCode ?? null
  if (current && resolveRequestedProject(requested, current, projectAccesses).kind === "switch") {
    return (
      <p role="status" className="text-muted-foreground text-sm">
        Opening project {requested}…
      </p>
    )
  }
  return <>{children}</>
}
