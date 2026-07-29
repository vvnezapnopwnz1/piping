"use client"

import * as React from "react"
import type { Session, User } from "@supabase/supabase-js"

import { useAppMode } from "@/contexts/app-mode-context"
import type { Role } from "@/contexts/role-context"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"

import {
  deriveSupabaseAccessState,
  synchronizeMembershipProjectDisplay,
  type SupabaseAccessState,
} from "./supabase-auth-state"

export interface SupabaseMembership {
  membershipId: string
  projectId: string
  activityCode: string
  title: string
  role: Role
}

interface SupabaseAuthContextValue {
  user: User | null
  membership: SupabaseMembership | null
  error: Error | null
  accessState: SupabaseAccessState
  signOut: () => Promise<void>
  synchronizeProjectDisplay: (
    projectId: string,
    project: Pick<SupabaseMembership, "activityCode" | "title">
  ) => void
}

interface MembershipQueryRow {
  id: string
  role: Role
  project: {
    id: string
    activity_code: string
    title: string
  } | null
}

const SupabaseAuthContext = React.createContext<SupabaseAuthContextValue | null>(
  null
)

function normalizeMembership(
  membership: MembershipQueryRow | null
): SupabaseMembership | null {
  if (!membership?.project) {
    return null
  }

  return {
    membershipId: membership.id,
    projectId: membership.project.id,
    activityCode: membership.project.activity_code,
    title: membership.project.title,
    role: membership.role,
  }
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const appMode = useAppMode()
  const [user, setUser] = React.useState<User | null>(null)
  const [membership, setMembership] = React.useState<SupabaseMembership | null>(
    null
  )
  const [error, setError] = React.useState<Error | null>(null)
  const [accessState, setAccessState] =
    React.useState<SupabaseAccessState>("loading")

  React.useEffect(() => {
    if (appMode === "demo") {
      setUser(null)
      setMembership(null)
      setError(null)
      setAccessState("unauthenticated")
      return
    }

    const client = getSupabaseBrowserClient()
    let disposed = false
    let requestVersion = 0

    const loadMembership = async (session: Session | null) => {
      const currentRequest = ++requestVersion
      const sessionUser = session?.user ?? null

      setUser(sessionUser)
      setMembership(null)
      setError(null)

      if (!sessionUser) {
        setAccessState("unauthenticated")
        return
      }

      setAccessState("loading")

      const { data, error: membershipError } = await client
        .from("project_memberships")
        .select("id, role, project:projects(id, activity_code, title)")
        .eq("user_id", sessionUser.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle()

      if (disposed || currentRequest !== requestVersion) {
        return
      }

      if (membershipError) {
        setError(membershipError)
        setMembership(null)
        setAccessState(deriveSupabaseAccessState(sessionUser, null))
        return
      }

      const normalizedMembership = normalizeMembership(data)
      setMembership(normalizedMembership)
      setAccessState(
        deriveSupabaseAccessState(sessionUser, normalizedMembership)
      )
    }

    void client.auth.getSession().then(
      ({ data: { session }, error: sessionError }) => {
        if (disposed) {
          return
        }

        if (sessionError) {
          setUser(null)
          setMembership(null)
          setError(sessionError)
          setAccessState("unauthenticated")
          return
        }

        return loadMembership(session)
      },
      (sessionError: Error) => {
        if (!disposed) {
          setUser(null)
          setMembership(null)
          setError(sessionError)
          setAccessState("unauthenticated")
        }
      }
    )

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      void loadMembership(session)
    })

    return () => {
      disposed = true
      requestVersion += 1
      subscription.unsubscribe()
    }
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
      project: Pick<SupabaseMembership, "activityCode" | "title">
    ) => {
      if (appMode !== "supabase") {
        return
      }

      setMembership((current) =>
        synchronizeMembershipProjectDisplay(current, projectId, project)
      )
    },
    [appMode]
  )

  const value = React.useMemo(
    () => ({
      user,
      membership,
      error,
      accessState,
      signOut,
      synchronizeProjectDisplay,
    }),
    [accessState, error, membership, signOut, synchronizeProjectDisplay, user]
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
