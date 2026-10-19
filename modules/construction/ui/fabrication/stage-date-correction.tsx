"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { correctConstructionProgress } from "../../infrastructure/supabase-construction-repository"

/** Corrects a recorded stage date. The server keeps the old event and records why the date moved. */
export function StageDateCorrection({
  spoolRevisionId,
  stage,
  currentDate,
  disabled = false,
  onCorrected,
}: {
  spoolRevisionId: string
  stage: "start_fab" | "sent_to_paint"
  currentDate: string
  disabled?: boolean
  onCorrected: () => Promise<void> | void
}) {
  const t = useTranslations("fabrication.dateCorrection")
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(currentDate)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await correctConstructionProgress(
        getSupabaseBrowserClient(), spoolRevisionId, stage, date, reason.trim(), crypto.randomUUID(),
      )
      toast.success(t("saved"))
      setOpen(false)
      setReason("")
      await onCorrected()
    } catch (error: unknown) {
      toast.error(t("couldNotBeSaved"), { description: errorDetail(error) })
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => { setDate(currentDate); setOpen(true) }}>
        {t("open")}
      </Button>
    )
  }
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-sm font-medium">
        {t("newDate")}
        <Input type="date" value={date} disabled={busy} onChange={(event) => setDate(event.target.value)} className="mt-1" />
      </label>
      <label className="text-sm font-medium">
        {t("reason")}
        <Input value={reason} disabled={busy} placeholder={t("reasonPlaceholder")} onChange={(event) => setReason(event.target.value)} className="mt-1" />
      </label>
      <Button type="button" size="sm" disabled={busy || !date || date === currentDate || reason.trim() === ""} loading={busy} onClick={() => void save()}>
        {t("confirm")}
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setOpen(false)}>
        {t("cancel")}
      </Button>
    </div>
  )
}
