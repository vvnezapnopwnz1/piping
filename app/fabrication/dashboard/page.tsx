"use client"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { FabricationOverview } from "@/modules/construction/ui/fabrication/fabrication-overview"

export default function FabricationDashboardPage() {
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null

  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">
        Select a project to see fabrication progress.
      </p>
    )
  }

  return <FabricationOverview projectId={projectId} />
}
