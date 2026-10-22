"use client"

import { XIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { errorDetail } from "@/i18n/format"
import type { SheetMatrix } from "@/modules/imports/domain/parsers/registry"
import { ImportIssueList } from "@/modules/imports/ui/import-issue-list"
import type { SpoolgenSubmission } from "../application/import-spooling"
import { buildTableSubmission, pickTableFile, type TableSource } from "../application/import-table"
import { createPickTickets } from "../application/pick-tickets"
import { parseDelimited } from "../domain/parsers/delimited"
import { SPOOLGEN_FILE_ROLES, SPOOLGEN_MAX_FILE_BYTES, SPOOLING_MAX_FILES, type SpoolgenFileRole } from "../domain/spoolgen-file"
import { readSourceFile } from "../infrastructure/spoolgen-file-reader"
import type { SpoolingUpload } from "../infrastructure/submit-spooling-import"
import { ImportTemplateDownload } from "./import-template-download"
import { describeSpoolgenIssue } from "./spoolgen-issue-text"

type Role = SpoolgenFileRole

const without = <T,>(record: Partial<Record<Role, T>>, role: Role): Partial<Record<Role, T>> => { const next = { ...record }; delete next[role]; return next }

/**
 * The four SpoolGen files, one per role, weld required, read by their fixed contract. Each file is read as soon as it is
 * picked (the newest pick of a role wins); a missing column is listed under the files and left to the server to report.
 */
export function SpoolgenImportPanel({ canManage, busy, onEdit, onSubmit }: {
  canManage: boolean
  busy: boolean
  onEdit: () => void
  onSubmit: (submission: SpoolgenSubmission, uploads: readonly SpoolingUpload[]) => void
}) {
  const t = useTranslations("spooling")
  const tc = useTranslations("codes")
  const inputs = useRef<Partial<Record<Role, HTMLInputElement | null>>>({})
  const [tickets] = useState(() => createPickTickets<Role>())
  const [files, setFiles] = useState<Partial<Record<Role, { file: File; matrix: SheetMatrix }>>>({})
  const [reading, setReading] = useState<Partial<Record<Role, string>>>({})
  const sources = useMemo<TableSource[]>(() => SPOOLGEN_FILE_ROLES.flatMap((role) => { const held = files[role]; return held ? [{ role, fileName: held.file.name, matrix: held.matrix }] : [] }), [files])
  // The four fixed-contract files go to the server as they are, a missing column too: the server reports it.
  const submission = useMemo(() => buildTableSubmission(sources), [sources])

  const pick = async (role: Role, file: File | undefined) => {
    if (file === undefined) return
    const others = SPOOLGEN_FILE_ROLES.filter((other) => other !== role && files[other] !== undefined).length
    const { taken, replaced, refused, overLimit } = pickTableFile(role, files[role]?.file, file, others)
    for (const issue of refused) toast.error(describeSpoolgenIssue(t, issue))
    if (overLimit > 0) toast.error(t("importScreen.tooMany", { count: overLimit, limit: SPOOLING_MAX_FILES }))
    if (taken === undefined) return
    if (replaced !== undefined) toast.info(t("table.replaced", { file: taken.name, previous: replaced.name }))
    const ticket = tickets.issue(role)
    setReading((current) => ({ ...current, [role]: taken.name }))
    try {
      const matrix = parseDelimited((await readSourceFile(taken)).text)
      if (!tickets.isCurrent(role, ticket)) return
      setFiles((current) => ({ ...current, [role]: { file: taken, matrix } }))
      onEdit()
    } catch (error) {
      if (tickets.isCurrent(role, ticket)) toast.error(t("table.readFailed", { file: taken.name }), { description: errorDetail(error) })
    } finally {
      if (tickets.isCurrent(role, ticket)) setReading((current) => without(current, role))
    }
  }
  const remove = (role: Role) => {
    tickets.cancel(role)
    setReading((current) => without(current, role))
    setFiles((current) => without(current, role))
    onEdit()
  }
  const validate = () => onSubmit(submission, SPOOLGEN_FILE_ROLES.flatMap((role) => { const held = files[role]; return held ? [{ role, file: held.file }] : [] }))
  const stillReading = Object.keys(reading).length > 0
  const unmatched = Object.keys(submission.missingColumns).length > 0
  const reason = files.weld === undefined ? t("table.weldRequired") : unmatched ? t("table.columnsLeftToServer") : null

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("importScreen.hint", { limit: SPOOLGEN_MAX_FILE_BYTES / (1024 * 1024) })}</p>
      <ImportTemplateDownload source="spoolgen" references={null} disabled={busy} />
      <div className="space-y-3">
        {SPOOLGEN_FILE_ROLES.map((role) => {
          const held = files[role]
          return (
            <div key={role} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-72 shrink-0">{tc(`spoolgenRole.${role}`)}</span>
              <input
                ref={(element) => { inputs.current[role] = element }}
                className="sr-only"
                type="file"
                accept=".txt,.csv,.tsv"
                disabled={busy || !canManage}
                onChange={(event) => { void pick(role, event.target.files?.[0]); event.target.value = "" }}
              />
              <Button type="button" variant={held ? "outline" : "default"} disabled={busy || !canManage} onClick={() => inputs.current[role]?.click()}>
                {held ? t("importScreen.replace", { file: held.file.name }) : tc(`spoolgenUpload.${role}`)}
              </Button>
              {reading[role] ? <span className="text-xs text-muted-foreground">{t("table.reading", { file: reading[role] })}</span> : null}
              {held ? (
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t("table.remove", { file: held.file.name })} disabled={busy || !canManage} onClick={() => remove(role)}>
                  <XIcon />
                </Button>
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" loading={busy} disabled={!canManage || !submission.canSubmit || stillReading} onClick={validate}>
          {t("importScreen.validate")}
        </Button>
        {reason ? <span className="text-sm text-muted-foreground">{reason}</span> : null}
      </div>
      {unmatched ? (
        <ImportIssueList issues={submission.issues.filter((issue) => issue.code === "MISSING_COLUMN").map((issue) => ({ ...issue, message: describeSpoolgenIssue(t, issue) }))} />
      ) : null}
    </div>
  )
}
