"use client"

import { XIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import type { SheetMatrix } from "@/modules/imports/domain/parsers/registry"
import { readFirstSheetMatrix } from "@/modules/imports/infrastructure/xlsx-workbook"
import { ImportIssueList } from "@/modules/imports/ui/import-issue-list"
import type { SpoolgenSubmission } from "../application/import-spooling"
import { buildTableSubmission, describeTableColumns, type TableSource } from "../application/import-table"
import { BUILT_IN_TEMPLATES, type ImportTemplate, type TableTemplateSettings } from "../domain/import-template"
import { parseDelimited } from "../domain/parsers/delimited"
import { SPOOLGEN_FILE_ROLES, SPOOLGEN_MAX_FILE_BYTES, SPOOLING_MAX_FILES, addPickedFiles, type SpoolgenFileRole } from "../domain/spoolgen-file"
import { readSourceFile } from "../infrastructure/spoolgen-file-reader"
import { loadImportTemplates, saveImportTemplate } from "../infrastructure/supabase-import-template-repository"
import type { SpoolingUpload } from "../infrastructure/submit-spooling-import"
import { ColumnMappingEditor } from "./column-mapping-editor"
import { describeSpoolgenIssue } from "./spoolgen-issue-text"

/** The two sources read as tables: Excel/CSV with a column map, and the four SpoolGen files with their fixed contract. */
export type TableSourceId = "table" | "spoolgen"

const ACCEPT: Record<TableSourceId, string> = { table: ".xlsx,.xls,.csv,.txt", spoolgen: ".txt,.csv,.tsv" }
const BUILT_IN_ID = "built-in"
const copyOf = (settings: ImportTemplate["settings"]): TableTemplateSettings => (settings.kind === "table" ? structuredClone(settings) : { kind: "table", columns: {} })

/** A workbook gives its first sheet; anything else is text in any of the encodings the reader knows. */
async function readMatrix(source: TableSourceId, file: File): Promise<SheetMatrix> {
  if (source === "table" && /\.xlsx?$/i.test(file.name)) return readFirstSheetMatrix(await file.arrayBuffer())
  return parseDelimited((await readSourceFile(file)).text)
}

/**
 * One file per role, weld required. Each file is read as soon as it is picked, so a table shows its unmatched columns
 * under its slot before anything is sent; the four SpoolGen files have a fixed contract and no mapping.
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
  const inputs = useRef<Partial<Record<SpoolgenFileRole, HTMLInputElement | null>>>({})
  const [files, setFiles] = useState<Partial<Record<SpoolgenFileRole, { file: File; matrix: SheetMatrix }>>>({})
  const [settings, setSettings] = useState<TableTemplateSettings>(() => copyOf(BUILT_IN_TEMPLATES.find((template) => template.source === source)!.settings))
  const [mapping, setMapping] = useState<Partial<Record<SpoolgenFileRole, boolean>>>({})
  const sources = useMemo<TableSource[]>(() => SPOOLGEN_FILE_ROLES.flatMap((role) => { const held = files[role]; return held ? [{ role, fileName: held.file.name, matrix: held.matrix }] : [] }), [files])
  const submission = useMemo(() => buildTableSubmission(sources, settings), [sources, settings])
  const mappable = source === "table"

  const edit = (next: (current: typeof files) => typeof files) => { setFiles(next); onEdit() }
  const pick = async (role: SpoolgenFileRole, file: File | undefined) => {
    if (file === undefined) return
    const others = SPOOLGEN_FILE_ROLES.filter((other) => other !== role && files[other] !== undefined).length
    const { files: [taken], refused, overLimit } = addPickedFiles(role, [], [file], others)
    for (const issue of refused) toast.error(describeSpoolgenIssue(t, issue))
    if (overLimit > 0) toast.error(t("importScreen.tooMany", { count: overLimit, limit: SPOOLING_MAX_FILES }))
    if (taken === undefined) return
    try {
      const matrix = await readMatrix(source, taken)
      edit((current) => ({ ...current, [role]: { file: taken, matrix } }))
    } catch (error) {
      toast.error(t("table.readFailed", { file: taken.name }), { description: errorDetail(error) })
    }
  }
  const remove = (role: SpoolgenFileRole) => { edit((current) => { const next = { ...current }; delete next[role]; return next }); setMapping((current) => ({ ...current, [role]: false })) }
  const applyMapping = (role: SpoolgenFileRole, columnMap: Record<string, string>) => { setSettings((current) => ({ kind: "table", columns: { ...current.columns, [role]: columnMap } })); onEdit() }
  const pickTemplate = (next: TableTemplateSettings) => { setSettings(next); onEdit() }
  const validate = () => onSubmit(submission, SPOOLGEN_FILE_ROLES.flatMap((role) => { const held = files[role]; return held ? [{ role, file: held.file }] : [] }))
  const unmatched = Object.keys(submission.missingColumns).length > 0
  const reason = files.weld === undefined ? t("table.weldRequired") : unmatched ? t("table.unmatched") : null
  const limit = SPOOLGEN_MAX_FILE_BYTES / (1024 * 1024)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{mappable ? t("table.hint", { limit }) : t("importScreen.hint", { limit })}</p>
      {mappable ? <TemplateBar projectId={projectId} canManage={canManage} disabled={busy} settings={settings} onPick={pickTemplate} /> : null}
      <div className="space-y-3">
        {SPOOLGEN_FILE_ROLES.map((role) => {
          const held = files[role]
          const editing = mappable && held !== undefined && (submission.missingColumns[role] !== undefined || mapping[role] === true)
          const described = editing && held ? describeTableColumns({ role, fileName: held.file.name, matrix: held.matrix }, settings.columns[role]) : null
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
                {held ? (
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t("table.remove", { file: held.file.name })} disabled={busy || !canManage} onClick={() => remove(role)}>
                    <XIcon />
                  </Button>
                ) : null}
                {mappable && held && !editing ? (
                  <Button type="button" variant="link" size="sm" onClick={() => setMapping((current) => ({ ...current, [role]: true }))}>
                    {t("table.mapColumns")}
                  </Button>
                ) : null}
              </div>
              {described && held ? (
                <ColumnMappingEditor
                  key={`${held.file.name}|${held.file.lastModified}|${held.file.size}|${JSON.stringify(settings.columns[role] ?? {})}`}
                  fileName={held.file.name}
                  headers={described.headers}
                  columns={described.columns}
                  disabled={busy}
                  onApply={(columnMap) => applyMapping(role, columnMap)}
                />
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" loading={busy} disabled={!canManage || !submission.canSubmit} onClick={validate}>
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

/** The built-in template and the project's own for Excel/CSV; the columns matched now can be saved under a new name. */
function TemplateBar({ projectId, canManage, disabled, settings, onPick }: {
  projectId: string
  canManage: boolean
  disabled: boolean
  settings: TableTemplateSettings
  onPick: (settings: TableTemplateSettings) => void
}) {
  const t = useTranslations("spooling.templates")
  const id = useId()
  const builtIn = BUILT_IN_TEMPLATES.find((template) => template.source === "table")!
  const [templates, setTemplates] = useState<ImportTemplate[]>([])
  const [chosen, setChosen] = useState(BUILT_IN_ID)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let live = true
    loadImportTemplates(getSupabaseBrowserClient(), projectId)
      .then((rows) => { if (live) setTemplates(rows.filter((row) => row.source === "table")) })
      .catch((error: unknown) => toast.error(t("loadFailed"), { description: errorDetail(error) }))
    return () => { live = false }
  }, [projectId, t])

  const choose = (value: string) => {
    setChosen(value)
    onPick(copyOf((templates.find((template) => template.id === value) ?? builtIn).settings))
  }
  const save = async () => {
    setSaving(true)
    try {
      const saved = await saveImportTemplate(getSupabaseBrowserClient(), projectId, { id: null, source: "table", name, settings })
      setTemplates((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)))
      setChosen(saved.id ?? BUILT_IN_ID)
      setName("")
      toast.success(t("saved", { name: saved.name }))
    } catch (error) {
      toast.error(t("saveFailed"), { description: errorDetail(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-template`}>{t("label")}</Label>
        <Select value={chosen} onValueChange={choose} disabled={disabled}>
          <SelectTrigger id={`${id}-template`} className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={BUILT_IN_ID}>{builtIn.name}</SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id ?? BUILT_IN_ID}>{template.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`}>{t("name")}</Label>
        <Input id={`${id}-name`} className="w-64" maxLength={120} value={name} disabled={!canManage || disabled} onChange={(event) => setName(event.target.value)} />
      </div>
      <Button type="button" variant="outline" loading={saving} disabled={!canManage || disabled || name.trim() === ""} onClick={() => void save()}>
        {t("saveAs")}
      </Button>
    </div>
  )
}
