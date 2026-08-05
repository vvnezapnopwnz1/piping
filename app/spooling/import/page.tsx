"use client"

import { useCallback, useState } from "react"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { RevisionWorkbench } from "@/modules/engineering/ui/revision-workbench"
import { SpoolingImportScreen } from "@/modules/engineering/ui/spooling-import-screen"

export default function SpoolingImportPage() {
  const access = useOptionalAccess()
  const [jobId, setJobId] = useState<string | null>(null)
  const onApplied = useCallback(() => setJobId(null), [])

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">Select a project to import SpoolGen files.</p>
    )
  }

  const canManage = access?.can("spooling.manage") ?? false

  return (
    <div className="space-y-4">
      <SpoolingImportScreen projectId={projectId} canManage={canManage} onValidated={setJobId} />
      <RevisionWorkbench jobId={jobId} canManage={canManage} onApplied={onApplied} />
    </div>
  )
}
