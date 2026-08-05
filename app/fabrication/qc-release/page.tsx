"use client"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { QcReleaseScreen } from "@/modules/construction/ui/fabrication/qc-release-screen"

export default function QCReleasePage() {
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null

  if (!projectId) {
    return <p className="text-muted-foreground text-sm">Select a project to review QC release.</p>
  }

  return <QcReleaseScreen projectId={projectId} />
}
