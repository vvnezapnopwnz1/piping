"use client"

import { useMemo } from "react"
import { useCurrentRole } from "@/lib/pm-write-lock"
import { useAdminStore } from "@/store/admin-store"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"

export function useActiveSubcontractor(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("pipeqc-active-sub")
}

export function useScopeLock() {
  const appMode = useAppMode()
  const access = useOptionalAccess()
  const role = useCurrentRole()
  const activeSub = useActiveSubcontractor()
  const pdsAreas = useAdminStore((s) => s.pdsAreas)

  const isSubcontractorRole = role === "subcontractor"
  const subPdsAreas = useMemo(() => {
    if (!isSubcontractorRole || !activeSub) return null
    return new Set(
      pdsAreas
        .filter((a) => a.assignedSubCode === activeSub && a.active)
        .map((a) => a.code),
    )
  }, [pdsAreas, activeSub, isSubcontractorRole])

  if (appMode === "supabase") {
    return {
      active: access?.access.accessRole === "subcontractor",
      subCode: null,
      isInScope: (pdsAreaId: string | undefined) =>
        access?.isPdsAreaInScope(pdsAreaId) === true,
    }
  }

  return {
    active: subPdsAreas !== null,
    subCode: activeSub,
    isInScope: (pdsAreaCode: string | undefined): boolean => {
      if (!subPdsAreas) return true
      if (!pdsAreaCode) return true
      return subPdsAreas.has(pdsAreaCode)
    },
  }
}
