"use client"

import { Suspense } from "react"

import { QCReleaseView } from "@/components/fabrication/qc-release-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { QcReleaseScreen } from "@/modules/construction/ui/fabrication/qc-release-screen"

export default function QCReleasePage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") {
    return (
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
        <QCReleaseView />
      </Suspense>
    )
  }

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return <p className="text-sm text-muted-foreground">Select a project to review QC release.</p>
  }

  return <QcReleaseScreen projectId={projectId} />
}
