"use client"

import * as React from "react"
import type { Session, User } from "@supabase/supabase-js"

import { useAppMode } from "@/contexts/app-mode-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import {
  listCurrentUserProjects,
  type ProjectAccessSummary,
} from "@/modules/access/infrastructure/supabase-access-repository"

import {
  activeProjectStorageKey,
  deriveSupabaseAccessState,
  resolveActiveProjectAccess,
  sortProjectAccessesForDisplay,
  synchronizeProjectAccessDisplay,
  type SupabaseAccessState,
} from "./supabase-auth-state"

interface SupabaseAuthContextValue {
  user: User | null
  projectAccesses: ProjectAccessSummary[]
  access: ProjectAccessSummary | null
  error: Error | null
  accessState: SupabaseAccessState
  selectProject: (projectId: string) => void
  reloadAccess: () => void
  signOut: () => Promise<void>
  synchronizeProjectDisplay: (
    projectId: string,
    project: Pick<ProjectAccessSummary, "activityCode" | "title">
  ) => void
}

const SupabaseAuthContext = React.createContext<SupabaseAuthContextValue | null>(
  null
)

function safelyReadLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safelyWriteOrRemoveLocalStorage(key: string, projectId: string | null) {
  try {
    if (projectId) window.localStorage.setItem(key, projectId)
    else window.localStorage.removeItem(key)
  } catch {
    // Browser storage is a preference only; context remains usable without it.
  }
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const appMode = useAppMode()
  const [user, setUser] = React.useState<User | null>(null)
  const [projectAccesses, setProjectAccesses] = React.useState<
    ProjectAccessSummary[]
  >([])
  const [access, setAccess] = React.useState<ProjectAccessSummary | null>(null)
  const [error, setError] = React.useState<Error | null>(null)
  const [reloadVersion, setReloadVersion] = React.useState(0)
  const [accessState, setAccessState] =
    React.useState<SupabaseAccessState>("loading")

  React.useEffect(() => {
    if (appMode === "demo") {
      setUser(null)
      setProjectAccesses([])
      setAccess(null)
      setError(null)
      setAccessState("unauthenticated")
      return
    }

    const client = getSupabaseBrowserClient()
    let disposed = false
    let requestVersion = 0

    const loadAccess = async (session: Session | null) => {
      const currentRequest = ++requestVersion
      const sessionUser = session?.user ?? null

      setUser(sessionUser)
      setProjectAccesses([])
      setAccess(null)
      setError(null)

      if (!sessionUser) {
        setAccessState("unauthenticated")
        return
      }

      setAccessState("loading")

      let projectAccesses: ProjectAccessSummary[]
      try {
        projectAccesses = await listCurrentUserProjects(client)
      } catch (loadError) {
        if (disposed || currentRequest !== requestVersion) return

        setError(loadError instanceof Error ? loadError : new Error("Unable to load access."))
        setProjectAccesses([])
        setAccess(null)
        setAccessState(deriveSupabaseAccessState(sessionUser, null))
        return
      }

      if (disposed || currentRequest !== requestVersion) {
        return
      }

      const storageKey = activeProjectStorageKey(sessionUser.id)
      const preferredProjectId = safelyReadLocalStorage(storageKey)
      const activeAccess = resolveActiveProjectAccess(
        projectAccesses,
        preferredProjectId
      )

      setProjectAccesses(sortProjectAccessesForDisplay(projectAccesses))
      setAccess(activeAccess)
      setAccessState(
        deriveSupabaseAccessState(sessionUser, activeAccess)
      )
      safelyWriteOrRemoveLocalStorage(
        storageKey,
        activeAccess?.projectId ?? null
      )
    }

    void client.auth.getSession().then(
      ({ data: { session }, error: sessionError }) => {
        if (disposed) {
          return
        }

        if (sessionError) {
          setUser(null)
          setProjectAccesses([])
          setAccess(null)
          setError(sessionError)
          setAccessState("unauthenticated")
          return
        }

        return loadAccess(session)
      },
      (sessionError: Error) => {
        if (!disposed) {
          setUser(null)
          setProjectAccesses([])
          setAccess(null)
          setError(sessionError)
          setAccessState("unauthenticated")
        }
      }
    )

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      void loadAccess(session)
    })

    return () => {
      disposed = true
      requestVersion += 1
      subscription.unsubscribe()
    }
  }, [appMode, reloadVersion])

  const selectProject = React.useCallback(
    (projectId: string) => {
      if (appMode !== "supabase" || !user) return

      setProjectAccesses((currentProjectAccesses) => {
        const next = currentProjectAccesses.find(
          (item) => item.projectId === projectId
        )
        if (!next) return currentProjectAccesses

        setAccess(next)
        safelyWriteOrRemoveLocalStorage(
          activeProjectStorageKey(user.id),
          next.projectId
        )
        return currentProjectAccesses
      })
    },
    [appMode, user]
  )

  const reloadAccess = React.useCallback(() => {
    if (appMode === "supabase") setReloadVersion((current) => current + 1)
  }, [appMode])

  const signOut = React.useCallback(async () => {
    if (appMode === "demo") {
      return
    }

    const { error: signOutError } = await getSupabaseBrowserClient().auth.signOut()

    if (signOutError) {
      setError(signOutError)
    }
  }, [appMode])

  const synchronizeProjectDisplay = React.useCallback(
    (
      projectId: string,
      project: Pick<ProjectAccessSummary, "activityCode" | "title">
    ) => {
      if (appMode !== "supabase") {
        return
      }

      setProjectAccesses((currentProjectAccesses) =>
        currentProjectAccesses.map((item) =>
          item.projectId === projectId
            ? {
                ...item,
                activityCode: project.activityCode,
                title: project.title,
              }
            : item
        )
      )

      setAccess((current) =>
        synchronizeProjectAccessDisplay(current, projectId, project)
      )
    },
    [appMode]
  )

  const value = React.useMemo(
    () => ({
      user,
      projectAccesses,
      access,
      error,
      accessState,
      selectProject,
      reloadAccess,
      signOut,
      synchronizeProjectDisplay,
    }),
    [
      accessState,
      error,
      access,
      projectAccesses,
      selectProject,
      reloadAccess,
      signOut,
      synchronizeProjectDisplay,
      user,
    ]
  )

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}

export function useSupabaseAuth(): SupabaseAuthContextValue {
  const context = React.useContext(SupabaseAuthContext)

  if (!context) {
    throw new Error("useSupabaseAuth must be used within a SupabaseAuthProvider")
  }

  return context
}
