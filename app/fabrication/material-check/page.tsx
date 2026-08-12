"use client"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { MaterialCheckScreen } from "@/modules/construction/ui/fabrication/material-check-screen"

export default function MaterialCheckPage() {
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null

  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">Select a project to record material traces.</p>
    )
  }

  return <MaterialCheckScreen projectId={projectId} />
}
