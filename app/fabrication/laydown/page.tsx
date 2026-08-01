"use client"

import { Suspense } from "react"

import { LaydownView } from "@/components/fabrication/laydown-view"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { PaintLaydownScreen } from "@/modules/construction/ui/fabrication/paint-laydown-screen"

export default function LaydownPage() {
  const mode = useAppMode()
  const access = useOptionalAccess()

  if (mode === "demo") {
    return (
      <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
        <LaydownView />
      </Suspense>
    )
  }

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return <p className="text-sm text-muted-foreground">Select a project to record laydown.</p>
  }

  return <PaintLaydownScreen projectId={projectId} mode="laydown" />
}
