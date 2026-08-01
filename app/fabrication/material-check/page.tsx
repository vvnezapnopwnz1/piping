"use client"

import { Suspense } from "react"

import { MaterialCheckView } from "@/components/fabrication/material-check-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { MaterialCheckScreen } from "@/modules/construction/ui/fabrication/material-check-screen"

export default function MaterialCheckPage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") {
    return (
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
        <MaterialCheckView />
      </Suspense>
    )
  }

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a project to record material traces.
      </p>
    )
  }

  return <MaterialCheckScreen projectId={projectId} />
}
