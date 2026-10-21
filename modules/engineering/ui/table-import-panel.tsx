"use client"

import { XIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import type { SheetMatrix } from "@/modules/imports/domain/parsers/registry"
import { readFirstSheetMatrix } from "@/modules/imports/infrastructure/xlsx-workbook"
import { ImportIssueList } from "@/modules/imports/ui/import-issue-list"
import type { SpoolgenSubmission } from "../application/import-spooling"
import { applyColumnDrafts, buildTableSubmission, columnMapOf, describeTableColumns, hasMappedColumn, type ColumnDrafts, type TableSource } from "../application/import-table"
import { createPickTickets } from "../application/pick-tickets"
import { BUILT_IN_TEMPLATES, pickInitialTemplate, type ImportTemplate, type TableTemplateSettings } from "../domain/import-template"
import { parseDelimited } from "../domain/parsers/delimited"
import { SPOOLGEN_FILE_ROLES, SPOOLGEN_MAX_FILE_BYTES, SPOOLING_MAX_FILES, addPickedFiles, type SpoolgenFileRole } from "../domain/spoolgen-file"
import { readSourceFile } from "../infrastructure/spoolgen-file-reader"
import { loadImportTemplates } from "../infrastructure/supabase-import-template-repository"
import type { SpoolingUpload } from "../infrastructure/submit-spooling-import"
import { ColumnMappingEditor } from "./column-mapping-editor"
import { ImportTemplateBar } from "./import-template-bar"
import { describeSpoolgenIssue } from "./spoolgen-issue-text"

/** The two sources read as tables: Excel/CSV with a column map, and the four SpoolGen files with their fixed contract. */
export type TableSourceId = "table" | "spoolgen"
type Role = SpoolgenFileRole

const ACCEPT: Record<TableSourceId, string> = { table: ".xlsx,.xls,.csv,.txt", spoolgen: ".txt,.csv,.tsv" }
const copyOf = (settings: ImportTemplate["settings"]): TableTemplateSettings => (settings.kind === "table" ? structuredClone(settings) : { kind: "table", columns: {} })
const without = <T,>(record: Partial<Record<Role, T>>, role: Role): Partial<Record<Role, T>> => { const next = { ...record }; delete next[role]; return next }

/** A workbook gives its first sheet; anything else is text in any of the encodings the reader knows. */
async function readMatrix(source: TableSourceId, file: File): Promise<SheetMatrix> {
  if (source === "table" && /\.xlsx?$/i.test(file.name)) return readFirstSheetMatrix(await file.arrayBuffer())
  return parseDelimited((await readSourceFile(file)).text)
}

/**
 * One file per role, weld required. Each file is read as soon as it is picked (the newest pick of a role wins), so a
 * table shows its unmatched columns under its slot before anything is sent. A table upload starts on the project's
 * newest template; the four SpoolGen files have a fixed contract and no mapping.
 */
export function TableImportPanel({ projectId, source, canManage, busy, onEdit, onSubmit }: {
  projectId: string
  source: TableSourceId
  canManage: boolean
  busy: boolean
  onEdit: () => void
  onSubmit: (submission: SpoolgenSubmission, uploads: readonly SpoolingUpload[]) => void
}) {
  const t = useTranslations("spooling")
  const tc = useTranslations("codes")
  const mappable = source === "table"
  const inputs = useRef<Partial<Record<Role, HTMLInputElement | null>>>({})
  const [tickets] = useState(() => createPickTickets<Role>())
  const touched = useRef(false)
  const [files, setFiles] = useState<Partial<Record<Role, { file: File; matrix: SheetMatrix }>>>({})
  const [reading, setReading] = useState<Partial<Record<Role, string>>>({})
  const [settings, setSettings] = useState<TableTemplateSettings>(() => copyOf(BUILT_IN_TEMPLATES.find((template) => template.source === source)!.settings))
  const [drafts, setDrafts] = useState<ColumnDrafts>({})
  const [opened, setOpened] = useState<Partial<Record<Role, true>>>({})
  const [templates, setTemplates] = useState<ImportTemplate[]>([])
  const [chosenId, setChosenId] = useState<string | null>(null)
  const sources = useMemo<TableSource[]>(() => SPOOLGEN_FILE_ROLES.flatMap((role) => { const held = files[role]; return held ? [{ role, fileName: held.file.name, matrix: held.matrix }] : [] }), [files])
  const submission = useMemo(() => buildTableSubmission(sources, settings), [sources, settings])
  // The editors open now: a role with unmatched columns, or one opened by hand. Each shows its draft, else what is read now.
  const editors = useMemo(() => sources.flatMap((entry) => {
    if (!mappable || (submission.missingColumns[entry.role] === undefined && opened[entry.role] === undefined)) return []
    const described = describeTableColumns(entry, settings.columns[entry.role])
    return [{ ...entry, ...described, value: drafts[entry.role] ?? columnMapOf(described.columns) }]
  }), [drafts, mappable, opened, settings, sources, submission])
  const toSave = applyColumnDrafts(settings, Object.fromEntries(editors.map((editor) => [editor.role, editor.value])))

  useEffect(() => {
    if (!mappable) return
    let live = true
    loadImportTemplates(getSupabaseBrowserClient(), projectId)
      .then((rows) => {
        if (!live) return
        const own = rows.filter((row) => row.source === "table")
        const initial = pickInitialTemplate("table", own)
        setTemplates(own)
        if (initial.id === null || touched.current) return
        setChosenId(initial.id)
        setSettings(copyOf(initial.settings))
      })
      .catch((error: unknown) => toast.error(t("templates.loadFailed"), { description: errorDetail(error) }))
    return () => { live = false }
  }, [mappable, projectId, t])

  const changeSettings = (next: TableTemplateSettings, nextDrafts: ColumnDrafts) => { touched.current = true; setSettings(next); setDrafts(nextDrafts); onEdit() }
  const pick = async (role: Role, file: File | undefined) => {
    if (file === undefined) return
    const others = SPOOLGEN_FILE_ROLES.filter((other) => other !== role && files[other] !== undefined).length
    const { files: [taken], refused, overLimit } = addPickedFiles(role, [], [file], others)
    for (const issue of refused) toast.error(describeSpoolgenIssue(t, issue))
    if (overLimit > 0) toast.error(t("importScreen.tooMany", { count: overLimit, limit: SPOOLING_MAX_FILES }))
    if (taken === undefined) return
    const ticket = tickets.issue(role)
    setReading((current) => ({ ...current, [role]: taken.name }))
    try {
      const matrix = await readMatrix(source, taken)
      if (!tickets.isCurrent(role, ticket)) return
      setFiles((current) => ({ ...current, [role]: { file: taken, matrix } }))
      setDrafts((current) => without(current, role))
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
    setDrafts((current) => without(current, role))
    setOpened((current) => without(current, role))
    onEdit()
  }
  const draft = (role: Role, columnMap: Record<string, string>) => { touched.current = true; setDrafts((current) => ({ ...current, [role]: columnMap })) }
  const apply = (role: Role, columnMap: Record<string, string>) => changeSettings(applyColumnDrafts(settings, { [role]: columnMap }), without(drafts, role))
  const choose = (template: ImportTemplate) => { setChosenId(template.id); changeSettings(copyOf(template.settings), {}) }
  const saved = (template: ImportTemplate) => { setTemplates((current) => [template, ...current.filter((entry) => entry.id !== template.id)]); setChosenId(template.id); changeSettings(copyOf(template.settings), {}) }
  const validate = () => onSubmit(submission, SPOOLGEN_FILE_ROLES.flatMap((role) => { const held = files[role]; return held ? [{ role, file: held.file }] : [] }))
  const stillReading = Object.keys(reading).length > 0
  const unmatched = Object.keys(submission.missingColumns).length > 0
  const reason = files.weld === undefined ? t("table.weldRequired") : unmatched ? t("table.unmatched") : null
  const limit = SPOOLGEN_MAX_FILE_BYTES / (1024 * 1024)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{mappable ? t("table.hint", { limit }) : t("importScreen.hint", { limit })}</p>
      {mappable ? (
        <ImportTemplateBar projectId={projectId} source="table" templates={templates} chosenId={chosenId} settings={toSave} canSave={canManage && hasMappedColumn(toSave)} disabled={busy} onChoose={choose} onSaved={saved} />
      ) : null}
      <div className="space-y-3">
        {SPOOLGEN_FILE_ROLES.map((role) => {
          const held = files[role]
          const editor = editors.find((entry) => entry.role === role)
          return (
            <div key={role} className="space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="w-72 shrink-0">{mappable ? t(`table.role.${role}`) : tc(`spoolgenRole.${role}`)}</span>
                <input
                  ref={(element) => { inputs.current[role] = element }}
                  className="sr-only"
                  type="file"
                  accept={ACCEPT[source]}
                  disabled={busy || !canManage}
                  onChange={(event) => { void pick(role, event.target.files?.[0]); event.target.value = "" }}
                />
                <Button type="button" variant={held ? "outline" : "default"} disabled={busy || !canManage} onClick={() => inputs.current[role]?.click()}>
                  {held ? t("importScreen.replace", { file: held.file.name }) : mappable ? t("table.choose") : tc(`spoolgenUpload.${role}`)}
                </Button>
                {reading[role] ? <span className="text-xs text-muted-foreground">{t("table.reading", { file: reading[role] })}</span> : null}
                {held ? (
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t("table.remove", { file: held.file.name })} disabled={busy || !canManage} onClick={() => remove(role)}>
                    <XIcon />
                  </Button>
                ) : null}
                {mappable && held && !editor ? (
                  <Button type="button" variant="link" size="sm" onClick={() => setOpened((current) => ({ ...current, [role]: true }))}>
                    {t("table.mapColumns")}
                  </Button>
                ) : null}
              </div>
              {editor ? (
                <ColumnMappingEditor
                  fileName={editor.fileName}
                  headers={editor.headers}
                  columns={editor.columns}
                  value={editor.value}
                  disabled={busy}
                  onChange={(columnMap) => draft(role, columnMap)}
                  onApply={() => apply(role, editor.value)}
                />
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
      {!mappable && unmatched ? (
        <ImportIssueList issues={submission.issues.filter((issue) => issue.code === "MISSING_COLUMN").map((issue) => ({ ...issue, message: describeSpoolgenIssue(t, issue) }))} />
      ) : null}
    </div>
  )
}
