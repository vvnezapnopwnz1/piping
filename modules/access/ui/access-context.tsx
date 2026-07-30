"use client"

import * as React from "react"

import type { Capability, FunctionalRole } from "../domain/capability"
import {
  hasCapability,
  hasFunctionalRole,
  isPdsAreaInScope,
  isSubcontractorInScope,
  type EffectiveAccess,
} from "../domain/effective-access"

interface AccessContextValue {
  access: EffectiveAccess
  can: (capability: Capability) => boolean
  hasFunctionalRole: (role: FunctionalRole) => boolean
  isSubcontractorInScope: (id: string | undefined) => boolean
  isPdsAreaInScope: (id: string | undefined) => boolean
}

const AccessContext = React.createContext<AccessContextValue | null>(null)

export function AccessProvider({
  access,
  children,
}: {
  access: EffectiveAccess
  children: React.ReactNode
}) {
  const value = React.useMemo<AccessContextValue>(
    () => ({
      access,
      can: (capability) => hasCapability(access, capability),
      hasFunctionalRole: (role) => hasFunctionalRole(access, role),
      isSubcontractorInScope: (id) => isSubcontractorInScope(access, id),
      isPdsAreaInScope: (id) => isPdsAreaInScope(access, id),
    }),
    [access],
  )

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export function useAccess(): AccessContextValue {
  const context = React.useContext(AccessContext)
  if (!context) {
    throw new Error("useAccess must be used within an AccessProvider")
  }

  return context
}

export function useOptionalAccess(): AccessContextValue | null {
  return React.useContext(AccessContext)
}
