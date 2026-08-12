"use client"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { WeldProgressScreen } from "@/modules/construction/ui/fabrication/weld-progress-screen"

export default function WeldProgressPage() {
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null

  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">Select a project to record weld progress.</p>
    )
  }

  return <WeldProgressScreen projectId={projectId} />
}
