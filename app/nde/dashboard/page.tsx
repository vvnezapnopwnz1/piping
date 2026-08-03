"use client"

import { NdeDashboard } from "@/components/nde/nde-dashboard"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { NdeDashboardScreen } from "@/modules/quality/ui/nde-dashboard-screen"

export default function NdeDashboardPage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") {
    return <NdeDashboard />
  }

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return <p className="p-6 text-sm text-muted-foreground">Select a project to view NDE dashboard.</p>
  }

  return <NdeDashboardScreen projectId={projectId} />
}
