"use client"

import { useRole, type Role } from "@/contexts/role-context"
import { useAppMode } from "@/contexts/app-mode-context"
import type { Capability } from "@/modules/access/domain/capability"
import { useOptionalAccess } from "@/modules/access/ui/access-context"

export function useCurrentRole(): Role {
  return useRole().currentRole
}

export function useWriteCapability(capability: Capability | undefined): {
  locked: boolean
  reason: string
} {
  const appMode = useAppMode()
  const { currentRole } = useRole()
  const access = useOptionalAccess()
  if (appMode === "supabase") {
    const allowed = capability ? access?.can(capability) === true : false
    return { locked: !allowed, reason: allowed ? "" : "This action is unavailable until its required capability is defined." }
  }
  if (currentRole === "project_manager") {
    return {
      locked: true,
      reason:
        "Project Manager has read-only access. Switch to QC role to edit.",
    }
  }
  return { locked: false, reason: "" }
}

export function usePmWriteLock(): { locked: boolean; reason: string } {
  return useWriteCapability(undefined)
}
