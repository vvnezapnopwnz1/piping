"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { BUILT_IN_TEMPLATES, type ImportSourceId } from "../domain/import-template"

/** One tile per source, in the order of the built-in templates: the product name and which files it needs. */
export function ImportSourcePicker({ value, disabled, onChange }: { value: ImportSourceId | null; disabled: boolean; onChange: (source: ImportSourceId) => void }) {
  const t = useTranslations("spooling.sources")
  return (
    <div role="group" aria-label={t("choose")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {BUILT_IN_TEMPLATES.map(({ source, name }) => (
        <button
          key={source}
          type="button"
          aria-pressed={value === source}
          disabled={disabled}
          onClick={() => onChange(source)}
          className={cn(
            "flex flex-col items-start gap-1.5 rounded-lg border bg-card p-4 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-card",
            value === source && "border-primary ring-1 ring-primary",
          )}
        >
          <span className="font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">{t(`${source}.hint`)}</span>
        </button>
      ))}
    </div>
  )
}
