"use client"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { EngineeringBrowser } from "@/modules/engineering/ui/engineering-browser"

export default function SpoolingBrowsePage() {
  const access = useOptionalAccess()
  const projectId = access?.access.projectId ?? null

  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">Select a project to browse engineering data.</p>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Browse</h2>
      <EngineeringBrowser projectId={projectId} refreshToken={0} />
    </div>
  )
}
