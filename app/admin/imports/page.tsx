"use client"

import { useCallback, useState } from "react"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { ImportHistory } from "@/modules/imports/ui/import-history"
import { ImportWorkbench } from "@/modules/imports/ui/import-workbench"

export default function ImportsPage() {
  const access = useOptionalAccess()
  const [refreshToken, setRefreshToken] = useState(0)
  const onApplied = useCallback(() => setRefreshToken((token) => token + 1), [])

  // Use can(), not capabilities.includes(): hasCapability() also honours isPlatformAdmin,
  // which is never present in the capabilities array.
  const projectId = access?.access.projectId ?? null
  const canManage = access?.can("imports.manage") ?? false

  if (!projectId) {
    return <p className="text-muted-foreground text-sm">Select a project to run imports.</p>
  }

  return (
    <div className="space-y-4">
      <ImportWorkbench projectId={projectId} canManage={canManage} onApplied={onApplied} />
      <ImportHistory projectId={projectId} canManage={canManage} refreshToken={refreshToken} />
    </div>
  )
}
