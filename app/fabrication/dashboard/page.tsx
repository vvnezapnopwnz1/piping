"use client"

import { FabricationDashboard } from "@/components/fabrication-dashboard"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { FabricationOverview } from "@/modules/construction/ui/fabrication/fabrication-overview"

export default function FabricationDashboardPage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") return <FabricationDashboard />

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a project to see fabrication progress.
      </p>
    )
  }

  return <FabricationOverview projectId={projectId} />
}
