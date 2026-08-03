"use client"

import { BatchManagementView } from "@/components/nde/batch-management-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { NdeBatchScreen } from "@/modules/quality/ui/nde-batch-screen"

export default function NDEPage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") {
    return <BatchManagementView />
  }

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return <p className="p-6 text-sm text-muted-foreground">Select a project to manage NDE batches.</p>
  }

  return <NdeBatchScreen projectId={projectId} />
}
