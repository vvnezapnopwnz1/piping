"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Messages } from "@/i18n/messages"
import type { TableColumnChoice } from "../application/import-table"

type FieldKey = keyof Messages["spooling"]["mapping"]["fields"]
const NOT_IN_FILE = "none"

/**
 * Which column of one file holds which field. Every field of the role is offered, required or not, starting from the
 * header it is read from now; a Russian diameter column is never matched by name, so it is chosen here. Nothing
 * changes until "Check again" hands the whole choice back.
 */
export function ColumnMappingEditor({ fileName, headers, columns, disabled, onApply }: {
  fileName: string
  headers: readonly string[]
  columns: readonly TableColumnChoice[]
  disabled: boolean
  onApply: (columnMap: Record<string, string>) => void
}) {
  const t = useTranslations("spooling.mapping")
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(columns.flatMap((column) => (column.header === null ? [] : [[column.key, column.header]]))))
  const choose = (key: string, value: string) => setDraft((current) => {
    const next = { ...current }
    if (value === NOT_IN_FILE) delete next[key]
    else next[key] = headers[Number(value)]
    return next
  })
  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("title", { file: fileName })}</p>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      </div>
      <div className="grid gap-x-6 gap-y-2 lg:grid-cols-2">
        {columns.map((column) => {
          const index = draft[column.key] === undefined ? -1 : headers.indexOf(draft[column.key])
          return (
            <div key={column.key} className="flex items-center gap-3 text-sm">
              <span className="w-44 shrink-0">
                {t(`fields.${column.key as FieldKey}`)}
                {column.required ? " *" : null}
              </span>
              <Select value={index < 0 ? NOT_IN_FILE : String(index)} onValueChange={(value) => choose(column.key, value)} disabled={disabled}>
                <SelectTrigger size="sm" className="w-56" aria-invalid={column.required && index < 0}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_IN_FILE}>{t("notInFile")}</SelectItem>
                  {headers.map((header, position) => (
                    <SelectItem key={header} value={String(position)}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onApply(draft)}>
        {t("recheck")}
      </Button>
    </div>
  )
}
