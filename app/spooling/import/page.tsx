"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { useCallback, useState } from "react"

import { withProject } from "@/components/pipeqc/project-url"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"

import { useOptionalAccess } from "@/modules/access/ui/access-context"
import { RevisionWorkbench } from "@/modules/engineering/ui/revision-workbench"
import { SpoolingImport } from "@/modules/engineering/ui/spooling-import"

export default function SpoolingImportPage() {
  const t = useTranslations("spooling.pages")
  const tDone = useTranslations("spooling.importScreen.done")
  const access = useOptionalAccess()
  const activityCode = useSupabaseAuth().access?.activityCode ?? null
  const [jobId, setJobId] = useState<string | null>(null)
  // What the last apply did. The form is rebuilt after it (a new key drops the validated files and issues), so the
  // screen never keeps offering "apply" for an import that is already in the project.
  const [done, setDone] = useState<{ rows: number } | null>(null)
  const [formKey, setFormKey] = useState(0)
  const onApplied = useCallback((result: { rows: number }) => {
    setJobId(null)
    setDone(result)
    setFormKey((key) => key + 1)
  }, [])
  const onJobChange = useCallback((next: string | null) => {
    setJobId(next)
    if (next !== null) setDone(null)
  }, [])

  const projectId = access?.access.projectId ?? null
  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">{t("selectImport")}</p>
    )
  }

  const canManage = access?.can("spooling.manage") ?? false

  return (
    <div className="space-y-4">
      {done ? (
        <Card role="status">
          <CardHeader>
            <CardTitle>{tDone("title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{tDone("body", { count: done.rows })}</p>
            <p className="text-muted-foreground">{tDone("again")}</p>
            <Link className="font-medium underline" href={withProject("/spooling/browse", activityCode)}>
              {tDone("browse")}
            </Link>
          </CardContent>
        </Card>
      ) : null}
      <SpoolingImport key={formKey} projectId={projectId} canManage={canManage} onJobChange={onJobChange} />
      <RevisionWorkbench jobId={jobId} canManage={canManage} onApplied={onApplied} />
    </div>
  )
}
