"use client"

import { useTranslations } from "next-intl"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CodeChoices, UnmappedCodes } from "../application/pcf-unmapped"
import type { ImportReferences } from "../domain/import-template"

export type CodeKind = keyof UnmappedCodes
const KINDS: readonly CodeKind[] = ["serviceClasses", "weldTypes"]
const KEEP = "keep"

/**
 * The service classes and weld types of the files that the project has no code for, each with a drop-down of the
 * project's codes. A choice applies at once and goes into the template the panel saves; a code kept as it is goes to
 * the server unchanged, which refuses it. Codes are shown as the upload holds them.
 */
export function PcfMappingEditor({ unmapped, references, choices, disabled, onChoose }: {
  unmapped: UnmappedCodes
  references: ImportReferences
  choices: CodeChoices
  disabled: boolean
  onChoose: (kind: CodeKind, code: string, target: string | null) => void
}) {
  const t = useTranslations("spooling.pcf.mapping")
  const kinds = KINDS.filter((kind) => unmapped[kind].length > 0)
  if (kinds.length === 0) return null
  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("title")}</p>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      </div>
      {kinds.map((kind) => {
        const options = references[kind]
        return (
          <div key={kind} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t(kind)}</p>
            <div className="grid gap-x-6 gap-y-2 lg:grid-cols-2">
              {unmapped[kind].map((code) => {
                const index = Object.hasOwn(choices[kind], code) ? options.indexOf(choices[kind][code]) : -1
                return (
                  <div key={code} className="flex items-center gap-3 text-sm">
                    <span className="w-44 shrink-0 truncate font-mono" title={code}>{code}</span>
                    <Select value={index < 0 ? KEEP : String(index)} onValueChange={(choice) => onChoose(kind, code, choice === KEEP ? null : options[Number(choice)])} disabled={disabled}>
                      <SelectTrigger size="sm" className="w-56" aria-label={t("choose", { code })} aria-invalid={index < 0}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={KEEP}>{t("keep")}</SelectItem>
                        {options.map((option, position) => (
                          <SelectItem key={option} value={String(position)}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
