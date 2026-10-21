"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Messages } from "@/i18n/messages"
import { withColumnChoice, type TableColumnChoice } from "../application/import-table"

type FieldKey = keyof Messages["spooling"]["mapping"]["fields"]
const NOT_IN_FILE = "none"

/**
 * Which column of one file holds which field. Every field of the role is offered, required or not; a Russian diameter
 * column is never matched by name, so it is chosen here. The choice is held by the panel, so saving a template can take
 * it as it is; nothing is read with it until "Check again". "Not in the file" is a choice to drop the mapping, and a field
 * this file does not have shows it too without dropping anything.
 */
export function ColumnMappingEditor({ fileName, headers, columns, value, disabled, onChange, onApply }: {
  fileName: string
  headers: readonly string[]
  columns: readonly TableColumnChoice[]
  value: Record<string, string>
  disabled: boolean
  onChange: (columnMap: Record<string, string>) => void
  onApply: () => void
}) {
  const t = useTranslations("spooling.mapping")
  const choose = (key: string, choice: string) => {
    onChange(withColumnChoice(value, key, choice === NOT_IN_FILE ? null : headers[Number(choice)]))
  }
  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("title", { file: fileName })}</p>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
      </div>
      <div className="grid gap-x-6 gap-y-2 lg:grid-cols-2">
        {columns.map((column) => {
          const index = value[column.key] === undefined ? -1 : headers.indexOf(value[column.key])
          return (
            <div key={column.key} className="flex items-center gap-3 text-sm">
              <span className="w-44 shrink-0">
                {t(`fields.${column.key as FieldKey}`)}
                {column.required ? " *" : null}
              </span>
              <Select value={index < 0 ? NOT_IN_FILE : String(index)} onValueChange={(choice) => choose(column.key, choice)} disabled={disabled}>
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
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onApply}>
        {t("recheck")}
      </Button>
    </div>
  )
}
