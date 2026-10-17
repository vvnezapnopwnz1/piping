"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { codeLabel } from "@/i18n/translator"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { acceptNdeResults, rejectDraftValid } from "../../application/accept-nde-results"
import { jointState, jointStatusMessage } from "../../domain/nde-joint-state"
import type { NdeBatch, NdeObligation } from "../../domain/nde-batch"
import { closeNdeBatch, loadJointWelderIds, recordNdeResult, type QualityReferentials } from "../../infrastructure/supabase-quality-repository"

const today = () => new Date().toISOString().slice(0, 10)

/** Issued batches: tick the joints that passed and accept them together, or reject one with its defect. */
export function WaitingResultTab({ obligations, batches, referentials, onChanged }: { obligations: readonly NdeObligation[]; batches: readonly NdeBatch[]; referentials: QualityReferentials; onChanged: () => void }) {
  const t = useTranslations("nde.screen")
  const tb = useTranslations("nde.batch")
  const tc = useTranslations("codes")
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [date, setDate] = useState(today())
  const [report, setReport] = useState("")
  const [busy, setBusy] = useState(false)
  const [reject, setReject] = useState<{ ob: NdeObligation; defectCodeId: string; welderId: string; welderIds: string[] } | null>(null)

  const issued = batches.filter((batch) => batch.status === "issued")
  const byBatch = new Map<string, NdeObligation[]>()
  for (const ob of obligations) if (ob.batchNumber) byBatch.set(ob.batchNumber, [...(byBatch.get(ob.batchNumber) ?? []), ob])

  const accept = async (waiting: NdeObligation[]) => {
    const chosen = waiting.filter((ob) => picked.has(ob.id))
    setBusy(true)
    try {
      const outcome = await acceptNdeResults(getSupabaseBrowserClient(), chosen.map((ob) => ob.id), date, report || null)
      const next = new Set(picked)
      for (const id of outcome.accepted) next.delete(id)
      setPicked(next)
      if (outcome.accepted.length > 0) toast.success(t("acceptedSummary", { count: outcome.accepted.length }))
      if (outcome.failed.length > 0) {
        const names = outcome.failed.map((item) => chosen.find((ob) => ob.id === item.id)?.weldNumber ?? item.id).join(", ")
        toast.error(t("notRecorded", { joints: names }), { description: outcome.failed[0].message })
      }
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const startReject = async (ob: NdeObligation) => {
    const welderIds = await loadJointWelderIds(getSupabaseBrowserClient(), ob.weldJointRevisionId).catch(() => [])
    setReject({ ob, defectCodeId: "", welderId: "", welderIds })
  }
  const saveReject = async () => {
    if (!reject || !rejectDraftValid(reject, reject.welderIds)) return
    setBusy(true)
    try {
      await recordNdeResult(getSupabaseBrowserClient(), reject.ob.id, "rejected", date, report || null, reject.defectCodeId, reject.welderId || null, `nde-reject-${reject.ob.id}`)
      toast.success(t("rejectionRecorded", { joint: reject.ob.weldNumber }))
      setReject(null)
      onChanged()
    } catch (error) {
      toast.error(tb("errors.failedToRecordResult"), { description: errorDetail(error) })
    } finally {
      setBusy(false)
    }
  }
  const close = async (batch: NdeBatch) => {
    try {
      await closeNdeBatch(getSupabaseBrowserClient(), batch.id, `browser-nde-batch-close-${batch.id}`)
      toast.success(tb("success.ndeBatchClosed"))
      onChanged()
    } catch (error) {
      toast.error(tb("errors.closingBatchFailed"), { description: errorDetail(error) })
    }
  }

  if (issued.length === 0) return <p className="rounded-lg border p-4 text-sm text-muted-foreground">{t("noIssued")}</p>
  return (
    <div className="space-y-3">
      {issued.map((batch) => {
        const all = byBatch.get(batch.batchNumber) ?? []
        const waiting = all.filter((ob) => jointState(ob) === "waiting_result")
        const isOpen = open[batch.id] ?? issued.length === 1
        const pickedHere = waiting.filter((ob) => picked.has(ob.id))
        return (
          <div key={batch.id} className="rounded-lg border bg-card">
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen({ ...open, [batch.id]: !isOpen })} className={`flex w-full items-center justify-between gap-3 p-3 text-left ${isOpen ? "sticky top-0 z-10 rounded-t-lg bg-primary text-primary-foreground" : ""}`}>
              <span><span className="font-mono font-medium">{batch.batchNumber}</span><span className="ml-2 text-sm opacity-80">{codeLabel(tc, "ndeMethod", batch.method)} · {tb(`coverageRegimeSummary.${batch.coverageRegime}`)}</span></span>
              <span className="flex items-center gap-2 text-sm">{t("batchProgress", { done: all.length - waiting.length, total: all.length })}{isOpen ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}</span>
            </button>
            {isOpen && (
              <div className="space-y-2 p-3">
                <div className="flex flex-wrap items-end gap-2 border-b pb-3">
                  <label className="text-sm">{t("examinedOn")}<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="ml-2 rounded border bg-transparent p-1.5" /></label>
                  <label className="text-sm">{t("reportNumber")}<input value={report} onChange={(event) => setReport(event.target.value)} className="ml-2 w-40 rounded border bg-transparent p-1.5" /></label>
                  <Button size="sm" variant="outline" onClick={() => setPicked(new Set([...picked, ...waiting.map((ob) => ob.id)]))}>{t("selectAll", { count: waiting.length })}</Button>
                  <Button size="sm" disabled={pickedHere.length === 0 || date === "" || busy} onClick={() => void accept(waiting)}>{t("acceptSelected", { count: pickedHere.length })}</Button>
                  {waiting.length === 0 && <Button size="sm" disabled={busy} onClick={() => void close(batch)}>{t("closeBatch")}</Button>}
                </div>
                {waiting.map((ob) => {
                  const status = jointStatusMessage(ob)
                  return (
                    <div key={ob.id} className="space-y-2">
                      <div className="flex items-center gap-3 rounded border px-3 py-1.5 text-sm">
                        <input type="checkbox" aria-label={ob.weldNumber} checked={picked.has(ob.id)} onChange={(event) => { const next = new Set(picked); if (event.target.checked) next.add(ob.id); else next.delete(ob.id); setPicked(next) }} />
                        <span className="w-40 font-mono">{ob.weldNumber}</span>
                        <span className="flex-1 text-muted-foreground">{ob.spoolNumber} · {tb(status.key as never, status.values as never)}</span>
                        <Button size="sm" variant="outline" onClick={() => void startReject(ob)}>{t("rejectJoint")}</Button>
                      </div>
                      {reject?.ob.id === ob.id && (
                        <div className="space-y-2 rounded-lg border border-destructive bg-card p-3">
                          <p className="text-sm font-medium">{t("rejectionOf", { joint: reject.ob.weldNumber })} · {date}</p>
                          <div className="flex flex-wrap items-end gap-3">
                            <label className="text-sm">{t("defectCode")}
                              <select className="mt-1 block rounded border bg-transparent p-2" value={reject.defectCodeId} onChange={(event) => setReject({ ...reject, defectCodeId: event.target.value })}>
                                <option value="">{t("selectDefect")}</option>
                                {referentials.reworkCodes.map((code) => <option key={code.id} value={code.id}>{code.code}{code.description ? ` · ${code.description}` : ""}</option>)}
                              </select>
                            </label>
                            <label className="text-sm">{t("responsibleWelder")}
                              <select className="mt-1 block rounded border bg-transparent p-2" value={reject.welderId} onChange={(event) => setReject({ ...reject, welderId: event.target.value })}>
                                <option value="">{t("noWelder")}</option>
                                {referentials.welders.filter((welder) => reject.welderIds.includes(welder.id)).map((welder) => <option key={welder.id} value={welder.id}>{welder.welderCode}{welder.fullName ? ` · ${welder.fullName}` : ""}</option>)}
                              </select>
                            </label>
                            <Button size="sm" disabled={busy || !rejectDraftValid(reject, reject.welderIds)} onClick={() => void saveReject()}>{t("recordRejection")}</Button>
                            <Button size="sm" variant="outline" onClick={() => setReject(null)}>{t("cancel")}</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {waiting.length === 0 && <p className="flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" aria-hidden="true" />{t("allHaveResult")}</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
