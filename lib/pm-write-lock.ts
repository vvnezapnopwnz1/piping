"use client"

import { useRole, type Role } from "@/contexts/role-context"

export function useCurrentRole(): Role {
  return useRole().currentRole
}

export function usePmWriteLock(): {
  locked: boolean
  reason: string
} {
  const { currentRole } = useRole()
  if (currentRole === "project_manager") {
    return {
      locked: true,
      reason:
        "Project Manager has read-only access. Switch to QC role to edit.",
    }
  }
  return { locked: false, reason: "" }
}
