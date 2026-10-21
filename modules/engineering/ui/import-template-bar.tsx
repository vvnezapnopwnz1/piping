"use client"

import { useTranslations } from "next-intl"
import { useId, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { BUILT_IN_TEMPLATES, ImportTemplateError, type ImportSourceId, type ImportTemplate, type ImportTemplateSettings } from "../domain/import-template"
import { saveImportTemplate } from "../infrastructure/supabase-import-template-repository"

const BUILT_IN_ID = "built-in"

/**
 * The source's built-in template and the project's own, newest first, and "Save as template" for the settings the panel
 * would save. The panel loads the list and decides which template an upload starts on.
 */
export function ImportTemplateBar({ projectId, source, templates, chosenId, settings, canSave, disabled, onChoose, onSaved }: {
  projectId: string
  source: ImportSourceId
  templates: readonly ImportTemplate[]
  chosenId: string | null
  settings: ImportTemplateSettings
  canSave: boolean
  disabled: boolean
  onChoose: (template: ImportTemplate) => void
  onSaved: (template: ImportTemplate) => void
}) {
  const t = useTranslations("spooling.templates")
  const te = useTranslations("spooling.templateErrors")
  const id = useId()
  const builtIn = BUILT_IN_TEMPLATES.find((template) => template.source === source)!
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const saved = await saveImportTemplate(getSupabaseBrowserClient(), projectId, { id: null, source, name, settings })
      setName("")
      onSaved(saved)
      toast.success(t("saved", { name: saved.name }))
    } catch (error) {
      // A coded error is told in the screen's words, with the server's own sentence, if it sent one, beneath.
      if (error instanceof ImportTemplateError) toast.error(te(error.code), { description: error.detail })
      else toast.error(te("TEMPLATE_SAVE_FAILED"), { description: errorDetail(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-template`}>{t("label")}</Label>
        <Select value={chosenId ?? BUILT_IN_ID} onValueChange={(value) => onChoose(templates.find((template) => template.id === value) ?? builtIn)} disabled={disabled}>
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
        <Input id={`${id}-name`} className="w-64" maxLength={120} value={name} disabled={disabled} onChange={(event) => setName(event.target.value)} />
      </div>
      <Button type="button" variant="outline" loading={saving} disabled={!canSave || disabled || name.trim() === ""} onClick={() => void save()}>
        {t("saveAs")}
      </Button>
    </div>
  )
}
