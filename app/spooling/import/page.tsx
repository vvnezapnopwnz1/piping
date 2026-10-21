"use client"

import { useTranslations } from "next-intl"
import { useCallback, useState } from "react"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { RevisionWorkbench } from "@/modules/engineering/ui/revision-workbench"
import { SpoolingImport } from "@/modules/engineering/ui/spooling-import"

export default function SpoolingImportPage() {
  const t = useTranslations("spooling.pages")
  const access = useOptionalAccess()
  const [jobId, setJobId] = useState<string | null>(null)
  const onApplied = useCallback(() => setJobId(null), [])

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">{t("selectImport")}</p>
    )
  }

  const canManage = access?.can("spooling.manage") ?? false

  return (
    <div className="space-y-4">
      <SpoolingImport projectId={projectId} canManage={canManage} onJobChange={setJobId} />
      <RevisionWorkbench jobId={jobId} canManage={canManage} onApplied={onApplied} />
    </div>
  )
}
