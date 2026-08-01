"use client"

import { WeldProgressDemoView } from "@/components/fabrication/weld-progress-demo-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { WeldProgressScreen } from "@/modules/construction/ui/fabrication/weld-progress-screen"

export default function WeldProgressPage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") return <WeldProgressDemoView />

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return (
      <p className="text-sm text-muted-foreground">Select a project to record weld progress.</p>
    )
  }

  return <WeldProgressScreen projectId={projectId} />
}
