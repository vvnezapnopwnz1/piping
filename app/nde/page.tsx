"use client"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { NdeBatchScreen } from "@/modules/quality/ui/nde-batch-screen"

export default function NDEPage() {
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null

  if (!projectId) {
    return (
      <p className="text-muted-foreground p-6 text-sm">Select a project to manage NDE batches.</p>
    )
  }

  return <NdeBatchScreen projectId={projectId} />
}
