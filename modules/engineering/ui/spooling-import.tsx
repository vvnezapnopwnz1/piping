"use client"

import { useTranslations } from "next-intl"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import type { SpoolgenSubmission } from "../application/import-spooling"
import { buildIssueEntries, countIssueEntries, type IssueEntry } from "../application/issue-entries"
import type { ImportSourceId } from "../domain/import-template"
import { submitSpoolingImport, type SpoolingUpload } from "../infrastructure/submit-spooling-import"
import { ExcelImportPanel } from "./excel-import-panel"
import { ImportSourcePicker } from "./import-source-picker"
import { IssueEntryList } from "./issue-entry-list"
import { PcfImportPanel } from "./pcf-import-panel"
import { SpoolgenImportPanel } from "./spoolgen-import-panel"

/**
 * The import screen: the source tiles, the chosen source's upload, and after validation what the browser and the server
 * found, one entry per reason. Every panel hands its rows and files to the same submit, so a job looks the same whatever
 * the source; what was sent is kept beside the server's issues, so an entry can name the rows a person sees.
 */
export function SpoolingImport({ projectId, canManage, onJobChange }: {
  projectId: string
  canManage: boolean
  /** The job whose revisions are decided below the form: a new one after validation, null as soon as the form is edited. */
  onJobChange: (jobId: string | null) => void
}) {
  const t = useTranslations("spooling")
  const [source, setSource] = useState<ImportSourceId | null>(null)
  const [busy, setBusy] = useState(false)
  const [entries, setEntries] = useState<IssueEntry[] | null>(null)
  // An edit drops the issues and the job they belong to, so decisions about an earlier upload never sit beside new files.
  const clearIssues = useCallback(() => { setEntries(null); onJobChange(null) }, [onJobChange])

  const submit = useCallback(async (submission: SpoolgenSubmission, uploads: readonly SpoolingUpload[]) => {
    if (!canManage || busy) return
    setBusy(true)
    try {
      const result = await submitSpoolingImport(getSupabaseBrowserClient(), projectId, submission, uploads)
      // Built once from what was sent and what the server stored: the toast counts what the list shows, so the two never disagree.
      const found = buildIssueEntries(submission, result.issues)
      setEntries(found)
      onJobChange(result.jobId)
      const { errors, warnings } = countIssueEntries(found)
      toast.success(t("importScreen.validated", { rows: submission.rows.length, errors, warnings }))
    } catch (error) {
      toast.error(t("importScreen.failed"), { description: errorDetail(error) })
    } finally {
      setBusy(false)
    }
  }, [busy, canManage, onJobChange, projectId, t])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("sources.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ImportSourcePicker value={source} disabled={busy} onChange={(next) => { setSource(next); clearIssues() }} />
        {source === "table" ? (
          <ExcelImportPanel key="table" projectId={projectId} canManage={canManage} busy={busy} onEdit={clearIssues} onSubmit={(submission, uploads) => void submit(submission, uploads)} />
        ) : null}
        {source === "spoolgen" ? (
          <SpoolgenImportPanel key="spoolgen" canManage={canManage} busy={busy} onEdit={clearIssues} onSubmit={(submission, uploads) => void submit(submission, uploads)} />
        ) : null}
        {source === "aveva" || source === "hexagon" || source === "plant3d" ? (
          <PcfImportPanel key={source} projectId={projectId} source={source} canManage={canManage} busy={busy} validated={entries !== null} onEdit={clearIssues} onSubmit={(submission, uploads) => void submit(submission, uploads)} />
        ) : null}
        {entries ? <IssueEntryList entries={entries} /> : null}
      </CardContent>
    </Card>
  )
}
