"use client"

import { useCallback, useState } from "react"
import { AdminTabs } from "../admin-tabs"
import { useAppMode } from "@/contexts/app-mode-context"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { ImportWorkbench } from "@/modules/imports/ui/import-workbench"
import { ImportHistory } from "@/modules/imports/ui/import-history"
import { ImportSettingsView } from "@/components/admin/import-settings-view"

export default function ImportsPage() {
  const appMode = useAppMode()
  const access = useOptionalAccess()
  const [refreshToken, setRefreshToken] = useState(0)

  const onApplied = useCallback(() => setRefreshToken((token) => token + 1), [])

  if (appMode === "demo") {
    return (
      <div className="space-y-4">
        <AdminTabs />
        <ImportSettingsView />
      </div>
    )
  }

  // Use can(), not capabilities.includes(): hasCapability() also honours
  // isPlatformAdmin, which is never present in the capabilities array.
  const projectId = access?.access.projectId ?? null
  const canManage = access?.can("imports.manage") ?? false

  if (!projectId) {
    return (
      <div className="space-y-4">
        <AdminTabs />
        <p className="text-sm text-muted-foreground">
          Select a project to run imports.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AdminTabs />
      <ImportWorkbench projectId={projectId} canManage={canManage} onApplied={onApplied} />
      <ImportHistory projectId={projectId} canManage={canManage} refreshToken={refreshToken} />
    </div>
  )
}
