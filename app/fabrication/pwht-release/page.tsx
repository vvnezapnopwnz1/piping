"use client"

import { PwhtReleaseView } from "@/components/fabrication/pwht-release-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { QcReleaseScreen } from "@/modules/construction/ui/fabrication/qc-release-screen"

export default function PWHTReleasePage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") return <PwhtReleaseView />

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return <p className="text-sm text-muted-foreground">Select a project to review PWHT.</p>
  }

  return <QcReleaseScreen projectId={projectId} />
}
