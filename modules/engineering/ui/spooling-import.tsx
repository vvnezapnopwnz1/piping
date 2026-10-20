"use client"

import { useTranslations } from "next-intl"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import type { StoredImportIssue } from "@/modules/imports/domain/stored-import-issue"
import { ImportIssueList } from "@/modules/imports/ui/import-issue-list"
import type { SpoolgenSubmission } from "../application/import-spooling"
import type { ImportSourceId } from "../domain/import-template"
import { submitSpoolingImport, type SpoolingUpload } from "../infrastructure/submit-spooling-import"
import { ImportSourcePicker } from "./import-source-picker"
import { describeSpoolgenIssue } from "./spoolgen-issue-text"
import { TableImportPanel } from "./table-import-panel"

/**
 * The import screen: the source tiles, the chosen source's upload, and after validation what the server found. Every
 * panel hands its rows and files to the same submit, so a job looks the same whatever the source.
 */
export function SpoolingImport({ projectId, canManage, onValidated }: { projectId: string; canManage: boolean; onValidated: (jobId: string) => void }) {
  const t = useTranslations("spooling")
  const [source, setSource] = useState<ImportSourceId | null>(null)
  const [busy, setBusy] = useState(false)
  const [issues, setIssues] = useState<StoredImportIssue[] | null>(null)
  const clearIssues = useCallback(() => setIssues(null), [])

  const submit = useCallback(async (submission: SpoolgenSubmission, uploads: readonly SpoolingUpload[]) => {
    if (!canManage || busy) return
    setBusy(true)
    try {
      const result = await submitSpoolingImport(getSupabaseBrowserClient(), projectId, submission, uploads)
      setIssues(result.issues)
      onValidated(result.jobId)
      toast.success(t("importScreen.validated", { rows: submission.rows.length, errors: result.counts.blockerCount, warnings: result.counts.warningCount }))
    } catch (error) {
      toast.error(t("importScreen.failed"), { description: errorDetail(error) })
    } finally {
      setBusy(false)
    }
  }, [busy, canManage, onValidated, projectId, t])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("sources.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ImportSourcePicker value={source} disabled={busy} onChange={(next) => { setSource(next); setIssues(null) }} />
        {source === "table" || source === "spoolgen" ? (
          <TableImportPanel key={source} projectId={projectId} source={source} canManage={canManage} busy={busy} onEdit={clearIssues} onSubmit={(submission, uploads) => void submit(submission, uploads)} />
        ) : null}
        {issues ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("importScreen.jobCreated")}</p>
            <ImportIssueList issues={issues.map((issue) => ({ ...issue, message: describeSpoolgenIssue(t, issue) }))} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
