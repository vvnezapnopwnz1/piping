"use client"

import { Upload } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { readNumberedSheets } from "@/modules/imports/infrastructure/xlsx-workbook"
import type { SpoolgenSubmission } from "../application/import-spooling"
import { readWorkbookUpload, type WorkbookReading } from "../application/import-table"
import { createPickTickets } from "../application/pick-tickets"
import type { ImportReferences } from "../domain/import-template"
import { SPOOLGEN_FILE_ROLES, SPOOLGEN_MAX_FILE_BYTES, addPickedFiles } from "../domain/spoolgen-file"
import { loadImportReferences } from "../infrastructure/supabase-import-template-repository"
import type { SpoolingUpload } from "../infrastructure/submit-spooling-import"
import { ImportTemplateDownload } from "./import-template-download"
import { describeSpoolgenIssue } from "./spoolgen-issue-text"

/** Why a picked workbook was not sent: no weld sheet, or a sheet without a required column. */
type Refusal = Exclude<WorkbookReading, { kind: "ready" }>

/**
 * The Excel tile: download our template, upload it filled in. The workbook is read whole as soon as it is picked, each
 * role from its own sheet, and is checked at once; a workbook without a weld sheet or a required column is not sent, so
 * no job is made for it. The newest pick wins, and the same file can be picked again after it is fixed.
 */
export function ExcelImportPanel({ projectId, canManage, busy, onEdit, onSubmit }: {
  projectId: string
  canManage: boolean
  busy: boolean
  onEdit: () => void
  onSubmit: (submission: SpoolgenSubmission, uploads: readonly SpoolingUpload[]) => void
}) {
  const t = useTranslations("spooling")
  const input = useRef<HTMLInputElement | null>(null)
  const [tickets] = useState(() => createPickTickets<"weld">())
  const [reading, setReading] = useState<string | null>(null)
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  // The project's codes, for the "Project codes" sheet of the template; null until they are loaded.
  const [references, setReferences] = useState<ImportReferences | null>(null)

  useEffect(() => {
    let live = true
    loadImportReferences(getSupabaseBrowserClient(), projectId)
      .then((loaded) => { if (live) setReferences(loaded) })
      .catch((error: unknown) => { if (live) toast.error(t("templates.codesFailed"), { description: errorDetail(error) }) })
    return () => { live = false }
  }, [projectId, t])

  const pick = async (file: File | undefined) => {
    if (file === undefined) return
    onEdit()
    setRefusal(null)
    const { refused } = addPickedFiles("weld", [], [file], 0)
    if (refused.length > 0) { for (const issue of refused) toast.error(describeSpoolgenIssue(t, issue)); return }
    const ticket = tickets.issue("weld")
    setReading(file.name)
    try {
      const read = readWorkbookUpload(file.name, readNumberedSheets(await file.arrayBuffer(), SPOOLGEN_FILE_ROLES))
      if (!tickets.isCurrent("weld", ticket)) return
      if (read.kind === "ready") onSubmit(read.submission, [{ role: "weld", file }])
      else setRefusal(read)
    } catch (error) {
      if (tickets.isCurrent("weld", ticket)) toast.error(t("table.readFailed", { file: file.name }), { description: errorDetail(error) })
    } finally {
      if (tickets.isCurrent("weld", ticket)) setReading(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("excel.hint", { limit: SPOOLGEN_MAX_FILE_BYTES / (1024 * 1024) })}</p>
      <div className="flex flex-wrap items-center gap-2">
        <ImportTemplateDownload source="table" references={references} disabled={busy} />
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept=".xlsx"
          disabled={busy || !canManage}
          onChange={(event) => { void pick(event.target.files?.[0]); event.target.value = "" }}
        />
        <Button type="button" size="sm" loading={busy || reading !== null} disabled={busy || !canManage} onClick={() => input.current?.click()}>
          <Upload />{t("excel.upload")}
        </Button>
        {reading ? <span className="text-xs text-muted-foreground">{t("table.reading", { file: reading })}</span> : null}
      </div>
      {refusal ? (
        <div role="alert" className="space-y-1 text-sm text-danger-fg">
          {refusal.kind === "noWeldSheet"
            ? <p>{t("excel.noWeldSheet")}</p>
            : refusal.sheets.map(({ sheet, headers }) => <p key={sheet}>{t("excel.missingColumns", { sheet, count: headers.length, columns: headers.join(", ") })}</p>)}
        </div>
      ) : null}
    </div>
  )
}
