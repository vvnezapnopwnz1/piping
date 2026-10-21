"use client"

import { XIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { cn } from "@/lib/utils"
import { ImportIssueList } from "@/modules/imports/ui/import-issue-list"
import { buildPcfSubmission, inFileNameOrder, type PcfSource } from "../application/import-pcf"
import type { SpoolgenSubmission } from "../application/import-spooling"
import { applyCodeChoices, suggestCodesToMap, type CodeChoices } from "../application/pcf-unmapped"
import { createPickTickets } from "../application/pick-tickets"
import { BUILT_IN_TEMPLATES, DEFAULT_PCF_SETTINGS, pickInitialTemplate, type ImportReferences, type ImportTemplate, type PcfTemplateSettings } from "../domain/import-template"
import { SPOOLGEN_MAX_FILE_BYTES, SPOOLING_MAX_FILES, addPickedFiles } from "../domain/spoolgen-file"
import { readSourceFile } from "../infrastructure/spoolgen-file-reader"
import { loadImportReferences, loadImportTemplates } from "../infrastructure/supabase-import-template-repository"
import type { SpoolingUpload } from "../infrastructure/submit-spooling-import"
import { ImportTemplateBar } from "./import-template-bar"
import { PcfMappingEditor, type CodeKind } from "./pcf-mapping-editor"
import { describeSpoolgenIssue } from "./spoolgen-issue-text"

/** The three sources read as PCF. They share one reader and differ only in their preset and hint. */
export type PcfSourceId = "aveva" | "hexagon" | "plant3d"
/** A picked file and its text, null while it is being read. */
interface Held { file: File; text: string | null }

const NO_CHOICES: CodeChoices = { serviceClasses: {}, weldTypes: {} }
const copyOf = (settings: ImportTemplate["settings"]): PcfTemplateSettings => structuredClone(settings.kind === "pcf" ? settings : DEFAULT_PCF_SETTINGS)
// A computed key and fromEntries make own keys, so a code called __proto__ is kept like any other.
const withChoice = (map: Record<string, string>, code: string, target: string | null): Record<string, string> =>
  target === null ? Object.fromEntries(Object.entries(map).filter(([key]) => key !== code)) : { ...map, [code]: target }

/**
 * Many PCF files, one per isometric, and one PDS area for all of them. Each file is read as soon as it is picked (the
 * newest pick of a name wins), and the codes the project does not have are offered for mapping before anything is sent.
 * An upload starts on the project's newest template for the source; the area is chosen per upload, never saved.
 */
export function PcfImportPanel({ projectId, source, canManage, busy, validated, onEdit, onSubmit }: {
  projectId: string
  source: PcfSourceId
  canManage: boolean
  busy: boolean
  /** A validation result is shown below, so the issues found while reading are listed there instead. */
  validated: boolean
  onEdit: () => void
  onSubmit: (submission: SpoolgenSubmission, uploads: readonly SpoolingUpload[]) => void
}) {
  const t = useTranslations("spooling")
  const id = useId()
  const input = useRef<HTMLInputElement | null>(null)
  const [tickets] = useState(() => createPickTickets<string>())
  const touched = useRef(false)
  const [files, setFiles] = useState<Held[]>([])
  const [pdsArea, setPdsArea] = useState("")
  const [references, setReferences] = useState<ImportReferences | null>(null)
  // Why the project's codes are missing, once loading them failed; the panel offers a retry instead of waiting for them forever.
  const [referencesFailed, setReferencesFailed] = useState<{ detail: string | undefined } | null>(null)
  const [referencesAttempt, setReferencesAttempt] = useState(0)
  const [settings, setSettings] = useState<PcfTemplateSettings>(() => copyOf(BUILT_IN_TEMPLATES.find((template) => template.source === source)!.settings))
  const [choices, setChoices] = useState<CodeChoices>(NO_CHOICES)
  const [templates, setTemplates] = useState<ImportTemplate[]>([])
  const [chosenId, setChosenId] = useState<string | null>(null)
  const sources = useMemo<PcfSource[]>(() => files.flatMap(({ file, text }) => (text === null ? [] : [{ fileName: file.name, text }])), [files])
  // Codes are looked for in what the template alone gives, so a code stays on the list while the person maps it.
  const fromTemplate = useMemo(() => buildPcfSubmission(sources, { pdsArea, settings }), [sources, pdsArea, settings])
  const toSave = useMemo(() => applyCodeChoices(settings, choices), [settings, choices])
  const submission = useMemo(() => (choices === NO_CHOICES ? fromTemplate : buildPcfSubmission(sources, { pdsArea, settings: toSave })), [choices, fromTemplate, sources, pdsArea, toSave])
  const unmapped = useMemo(() => (references === null ? null : suggestCodesToMap(fromTemplate, references)), [fromTemplate, references])

  useEffect(() => {
    let live = true
    loadImportTemplates(getSupabaseBrowserClient(), projectId)
      .then((rows) => {
        if (!live) return
        const own = rows.filter((row) => row.source === source)
        const initial = pickInitialTemplate(source, own)
        setTemplates(own)
        if (initial.id === null || touched.current) return
        setChosenId(initial.id)
        setSettings(copyOf(initial.settings))
        onEdit()
      })
      .catch((error: unknown) => { if (live) toast.error(t("templates.loadFailed"), { description: errorDetail(error) }) })
    return () => { live = false }
  }, [onEdit, projectId, source, t])

  useEffect(() => {
    let live = true
    loadImportReferences(getSupabaseBrowserClient(), projectId)
      .then((loaded) => { if (live) setReferences(loaded) })
      .catch((error: unknown) => { if (live) setReferencesFailed({ detail: errorDetail(error) }) })
    return () => { live = false }
  }, [projectId, referencesAttempt])

  const readFile = async (file: File, ticket: number) => {
    try {
      const { text } = await readSourceFile(file)
      if (tickets.isCurrent(file.name, ticket)) setFiles((current) => current.map((held) => (held.file === file ? { file, text } : held)))
    } catch (error) {
      if (!tickets.isCurrent(file.name, ticket)) return
      tickets.cancel(file.name)
      setFiles((current) => current.filter((held) => held.file !== file))
      toast.error(t("table.readFailed", { file: file.name }), { description: errorDetail(error) })
    }
  }
  const pick = (list: FileList | null) => {
    const picked = [...(list ?? [])]
    const { files: kept, refused, overLimit } = addPickedFiles("pcf", files.map((held) => held.file), picked, 0)
    for (const issue of refused) toast.error(describeSpoolgenIssue(t, issue))
    if (overLimit > 0) toast.error(t("importScreen.tooMany", { count: overLimit, limit: SPOOLING_MAX_FILES }))
    const fresh = picked.filter((file) => kept.includes(file))
    if (fresh.length === 0) return
    // Applied to the files as they are now, so a read that ended since this render keeps its text.
    setFiles((current) => addPickedFiles("pcf", current.map((held) => held.file), fresh, 0).files.map((file) => current.find((held) => held.file === file) ?? { file, text: null }))
    for (const file of fresh) void readFile(file, tickets.issue(file.name))
    onEdit()
  }
  const remove = (name: string) => { tickets.cancel(name); setFiles((current) => current.filter((held) => held.file.name !== name)); onEdit() }
  const removeAll = () => { for (const { file } of files) tickets.cancel(file.name); setFiles([]); onEdit() }
  const changeSettings = (next: PcfTemplateSettings) => { touched.current = true; setSettings(next); setChoices(NO_CHOICES); onEdit() }
  const choose = (template: ImportTemplate) => { setChosenId(template.id); changeSettings(copyOf(template.settings)) }
  const saved = (template: ImportTemplate) => { setTemplates((current) => [template, ...current.filter((entry) => entry.id !== template.id)]); setChosenId(template.id); changeSettings(copyOf(template.settings)) }
  const chooseCode = (kind: CodeKind, code: string, target: string | null) => { touched.current = true; setChoices((current) => ({ ...current, [kind]: withChoice(current[kind], code, target) })); onEdit() }
  const chooseArea = (code: string) => { setPdsArea(code); onEdit() }
  const retryReferences = () => { setReferencesFailed(null); setReferencesAttempt((attempt) => attempt + 1) }
  // Uploaded in name order, as the reader takes them: one set of files is one set of storage names whatever order they were picked in.
  const validate = () => onSubmit(submission, inFileNameOrder(files, ({ file }) => file.name).map(({ file }) => ({ role: "pcf", file })))

  const reading = files.filter((held) => held.text === null).length
  const noAreas = references !== null && references.pdsAreas.length === 0
  const reason = files.length === 0 ? t("pcf.filesRequired") : pdsArea === "" ? t("pcf.areaRequired") : null
  // The missing area is the drop-down's own message; every other issue names its file.
  const readIssues = validated ? [] : submission.issues.filter((issue) => issue.columnName !== "pds_area" || issue.rowNumber !== null)
  const locked = busy || !canManage

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("pcf.hint", { limit: SPOOLGEN_MAX_FILE_BYTES / (1024 * 1024), max: SPOOLING_MAX_FILES })}</p>
      <ImportTemplateBar projectId={projectId} source={source} templates={templates} chosenId={chosenId} settings={toSave} canSave={canManage} disabled={busy} onChoose={choose} onSaved={saved} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-area`}>{t("pcf.pdsArea")}</Label>
          <Select value={pdsArea} onValueChange={chooseArea} disabled={locked || references === null}>
            <SelectTrigger id={`${id}-area`} className="w-64" aria-invalid={files.length > 0 && pdsArea === ""}>
              <SelectValue placeholder={t("pcf.pdsAreaPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {(references?.pdsAreas ?? []).map((code) => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {referencesFailed !== null ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 pb-2 text-xs text-danger-fg">
            <span>{t("templates.codesFailed")}{referencesFailed.detail ? ` ${referencesFailed.detail}` : ""}</span>
            <Button type="button" variant="outline" size="sm" onClick={retryReferences}>{t("pcf.retry")}</Button>
          </div>
        ) : (
          <p className={cn("pb-2 text-xs", noAreas ? "text-warning-fg" : "text-muted-foreground")}>{noAreas ? t("pcf.noPdsAreas") : t("pcf.pdsAreaHint")}</p>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <input ref={input} className="sr-only" type="file" multiple accept=".pcf" disabled={locked} onChange={(event) => { pick(event.target.files); event.target.value = "" }} />
          <Button type="button" variant={files.length > 0 ? "outline" : "default"} disabled={locked} onClick={() => input.current?.click()}>
            {t("pcf.choose")}
          </Button>
          {files.length > 0 ? <span className="text-muted-foreground">{t("pcf.count", { count: files.length })}</span> : null}
          {reading > 0 ? <span className="text-xs text-muted-foreground">{t("pcf.reading", { count: reading })}</span> : null}
          {files.length > 0 ? (
            <Button type="button" variant="link" size="sm" disabled={locked} onClick={removeAll}>
              {t("pcf.removeAll")}
            </Button>
          ) : null}
        </div>
        {files.length > 0 ? (
          <ul className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
            {files.map(({ file, text }) => (
              <li key={file.name} className="flex items-center gap-1 rounded-md border py-0.5 pl-2 pr-0.5 text-xs">
                <span className={cn("font-mono", text === null && "text-muted-foreground")}>{file.name}</span>
                <Button type="button" variant="ghost" size="icon-sm" className="size-6" aria-label={t("table.remove", { file: file.name })} disabled={locked} onClick={() => remove(file.name)}>
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {references !== null && unmapped !== null ? (
        <PcfMappingEditor unmapped={unmapped} references={references} choices={choices} disabled={locked} onChoose={chooseCode} />
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" loading={busy} disabled={!canManage || !submission.canSubmit || reading > 0} onClick={validate}>
          {t("importScreen.validate")}
        </Button>
        {reason ? <span className="text-sm text-muted-foreground">{reason}</span> : null}
      </div>
      {readIssues.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("pcf.readIssues")}</p>
          <ImportIssueList issues={readIssues.map((issue) => ({ ...issue, message: describeSpoolgenIssue(t, issue) }))} />
        </div>
      ) : null}
    </div>
  )
}
