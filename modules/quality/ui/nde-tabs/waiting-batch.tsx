"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { codeLabel } from "@/i18n/translator"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { NDT_METHODS, type CoverageRegime, type NdeBatch, type NdeObligation, type NdtMethod } from "../../domain/nde-batch"
import { canCreateBatch, jointState } from "../../domain/nde-joint-state"
import { allocateNdeBatchCandidates, createNdeBatch, issueNdeBatch } from "../../infrastructure/supabase-quality-repository"

/** The sample a spot batch examines, and the whole of a mandatory one; the percentage can be changed in the form. */
const defaultPercent = (regime: CoverageRegime) => (regime === "spot" ? 10 : 100)

export function WaitingBatchTab({ projectId, obligations, batches, onChanged }: { projectId: string; obligations: readonly NdeObligation[]; batches: readonly NdeBatch[]; onChanged: () => void }) {
  const t = useTranslations("nde.screen")
  const tb = useTranslations("nde.batch")
  const tc = useTranslations("codes")
  const [busy, setBusy] = useState(false)
  const [method, setMethod] = useState<NdtMethod>("rt")
  const [regime, setRegime] = useState<CoverageRegime>("spot")
  const [percent, setPercent] = useState("10")

  const waiting = obligations.filter((ob) => jointState(ob) === "waiting_batch")
  const groups = new Map<string, NdeObligation[]>()
  for (const ob of waiting) groups.set(`${ob.method}|${ob.coverageRegime}`, [...(groups.get(`${ob.method}|${ob.coverageRegime}`) ?? []), ob])
  const drafts = batches.filter((batch) => batch.status === "draft")

  const run = async (work: () => Promise<string | null>) => {
    setBusy(true)
    try {
      const message = await work()
      if (message) toast.success(message)
      onChanged()
    } catch (error) {
      toast.error(tb("errors.couldNotCreateBatch"), { description: errorDetail(error) })
    } finally {
      setBusy(false)
    }
  }
  const createAndIssue = (m: NdtMethod, r: CoverageRegime, pct: number) =>
    run(async () => {
      const client = getSupabaseBrowserClient()
      const batch = await createNdeBatch(client, projectId, m, r, null, null, crypto.randomUUID())
      await allocateNdeBatchCandidates(client, batch.id, pct, `browser-nde-batch-allocate-${batch.id}-${pct}`)
      await issueNdeBatch(client, batch.id, `browser-nde-batch-issue-${batch.id}`)
      return t("batchCreatedIssued", { number: batch.batchNumber })
    })
  const issueDraft = (batch: NdeBatch) =>
    run(async () => {
      const client = getSupabaseBrowserClient()
      const pct = defaultPercent(batch.coverageRegime)
      await allocateNdeBatchCandidates(client, batch.id, pct, `browser-nde-batch-allocate-${batch.id}-${pct}`)
      await issueNdeBatch(client, batch.id, `browser-nde-batch-issue-${batch.id}`)
      return tb("success.ndeBatchIssued")
    })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
        <label className="text-sm">{t("method")}
          <select className="mt-1 block rounded border bg-transparent p-2" value={method} onChange={(event) => setMethod(event.target.value as NdtMethod)}>
            {NDT_METHODS.map((value) => <option key={value} value={value}>{codeLabel(tc, "ndeMethod", value)}</option>)}
          </select>
        </label>
        <label className="text-sm">{t("regime")}
          <select className="mt-1 block rounded border bg-transparent p-2" value={regime} onChange={(event) => { const next = event.target.value as CoverageRegime; setRegime(next); setPercent(String(defaultPercent(next))) }}>
            <option value="spot">{tb("coverageRegimeSummary.spot")}</option>
            <option value="mandatory_100">{tb("coverageRegimeSummary.mandatory_100")}</option>
          </select>
        </label>
        <label className="text-sm">{t("percentage")}
          <input type="number" min={1} max={100} className="mt-1 block w-20 rounded border bg-transparent p-2" value={percent} onChange={(event) => setPercent(event.target.value)} />
        </label>
        <Button disabled={busy || !canCreateBatch(obligations, method, regime) || !(Number(percent) > 0 && Number(percent) <= 100)} onClick={() => void createAndIssue(method, regime, Number(percent))}>{t("createAndIssue")}</Button>
      </div>
      {groups.size === 0 && drafts.length === 0 && <p className="rounded-lg border p-4 text-sm text-muted-foreground">{t("noWaiting")}</p>}
      {[...groups.entries()].map(([key, items]) => {
        const [m, r] = key.split("|") as [NdtMethod, CoverageRegime]
        return (
          <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm">
            <span>{t("waitingGroup", { method: codeLabel(tc, "ndeMethod", m), regime: tb(`coverageRegimeSummary.${r}`), count: items.length })}</span>
            <Button size="sm" disabled={busy} onClick={() => void createAndIssue(m, r, defaultPercent(r))}>{t("createBatchAt", { percent: defaultPercent(r) })}</Button>
          </div>
        )
      })}
      {drafts.map((batch) => (
        <div key={batch.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3 text-sm">
          <span className="font-mono">{batch.batchNumber} <Badge variant="outline">{t("draftBatch")}</Badge></span>
          <Button size="sm" disabled={busy || !canCreateBatch(obligations, batch.method, batch.coverageRegime)} onClick={() => void issueDraft(batch)}>{t("issue")}</Button>
        </div>
      ))}
    </div>
  )
}
