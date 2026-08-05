"use client"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { PaintLaydownScreen } from "@/modules/construction/ui/fabrication/paint-laydown-screen"

export default function PaintPage() {
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null

  if (!projectId) {
    return <p className="text-muted-foreground text-sm">Select a project to record painting.</p>
  }

  return <PaintLaydownScreen projectId={projectId} mode="paint" />
}
