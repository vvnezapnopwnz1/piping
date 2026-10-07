"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { ReferenceCombobox } from "@/components/ui/reference-combobox"
import type { BillLine, MaterialCandidate } from "../domain/material-check"
import type { MaterialDraftChoice } from "../application/material-check-draft"
import { loadMaterialTraceCandidates } from "../infrastructure/supabase-material-check-repository"

export interface MaterialTracePickerProps {
  line: BillLine
  selectedDraft?: MaterialDraftChoice
  disabled?: boolean
  pmlHref?: string
  onChoose: (line: BillLine, candidate: MaterialCandidate) => void
  onClear: (spoolRevisionMaterialId: string) => void
}

/** Loads the row's eligible PML records once, when first opened, and filters them locally. */
export function MaterialTracePicker({ line, selectedDraft, disabled = false, pmlHref, onChoose, onClear }: MaterialTracePickerProps) {
  const t = useTranslations("fabrication.shared")
  const [attempt, setAttempt] = useState(0)
  const [candidates, setCandidates] = useState<MaterialCandidate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (attempt === 0) return
    let ignore = false
    setError(null)
    loadMaterialTraceCandidates(getSupabaseBrowserClient(), line.spoolRevisionMaterialId)
      .then((rows) => { if (!ignore) setCandidates(rows) })
      .catch((err: unknown) => { if (!ignore) setError(err instanceof Error ? err.message : t("materialTracesCouldNotBe")) })
    return () => { ignore = true }
  }, [attempt, line.spoolRevisionMaterialId])

  const open = () => { if (attempt === 0) setAttempt(1) }
  const needle = query.trim().toLowerCase()
  const visible = useMemo(
    () => (candidates ?? []).filter((c) => !needle || c.traceNumber.toLowerCase().includes(needle) || c.mrrNumber.toLowerCase().includes(needle)),
    [candidates, needle],
  )

  return (
    <div className="flex flex-col gap-1 w-full" onClick={open} onFocus={open}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
        <span className="truncate">{line.expectedTraceNumber ? t("bomTrace", { trace: line.expectedTraceNumber }) : t("bomDoesNotSpecifyA")}</span>
        {pmlHref ? (
          <Link href={pmlHref} className="shrink-0 text-[10px] uppercase tracking-wider text-primary hover:underline">{t("openPml")}</Link>
        ) : (
          <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">{t("sourcePml")}</span>
        )}
      </div>
      <ReferenceCombobox
        label={t("materialTraceFor", { ident: line.identCode })}
        selectedId={selectedDraft?.pipingMaterialRecordId ?? null}
        selectedLabel={selectedDraft ? `${selectedDraft.traceNumber} (MRR ${selectedDraft.mrrNumber})` : null}
        // i18n-ignore — trace and MRR numbers; MRR reads the same in Russian
          options={visible.map((c) => ({ id: c.id, label: `${c.traceNumber} · MRR ${c.mrrNumber}` }))}
        query={query}
        loading={attempt > 0 && candidates === null && error === null}
        error={error}
        onQueryChange={setQuery}
        onChoose={(id) => { const candidate = candidates?.find((c) => c.id === id); if (candidate) onChoose(line, candidate) }}
        onClear={() => onClear(line.spoolRevisionMaterialId)}
        onRetry={() => setAttempt((n) => n + 1)}
        disabled={disabled}
        emptyMessage={needle ? t("noMatchingTraces") : t("noActivePmlEvidenceMatches")}
        placeholder={t("selectRegisteredTrace")}
      />
    </div>
  )
}
