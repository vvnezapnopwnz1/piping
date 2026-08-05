"use client"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { NdeDashboardScreen } from "@/modules/quality/ui/nde-dashboard-screen"

export default function NdeDashboardPage() {
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null

  if (!projectId) {
    return (
      <p className="text-muted-foreground p-6 text-sm">Select a project to view NDE dashboard.</p>
    )
  }

  return <NdeDashboardScreen projectId={projectId} />
}
