"use client"

import { useTranslations } from "next-intl"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useNameWorkContext, useWorkContextParam } from "@/components/pipeqc/work-context"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { jointState, ndeTab, NDE_TABS, type NdeTab } from "../domain/nde-joint-state"
import type { NdeBatch, NdeObligation } from "../domain/nde-batch"
import { loadNdeBatches, loadNdeObligations, loadQualityReferentials, type QualityReferentials } from "../infrastructure/supabase-quality-repository"
import { ClosedTab } from "./nde-tabs/closed"
import { JointsTab } from "./nde-tabs/joints"
import { SummaryTab } from "./nde-tabs/summary"
import { WaitingBatchTab } from "./nde-tabs/waiting-batch"
import { WaitingResultTab } from "./nde-tabs/waiting-result"

/** One NDE screen: the table of every joint first, the work queues and the summary as tabs (`?tab=`). */
export function NdeScreen({ projectId }: { projectId: string }) {
  const t = useTranslations("nde.screen")
  const tb = useTranslations("nde.batch")
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const tab = ndeTab(searchParams.get("tab"))
  const [obligations, setObligations] = useState<NdeObligation[]>([])
  const [batches, setBatches] = useState<NdeBatch[]>([])
  const [referentials, setReferentials] = useState<QualityReferentials>({ welders: [], reworkCodes: [] })
  const [loading, setLoading] = useState(true)
  const [spoolContext] = useWorkContextParam("spool")

  const reload = useCallback(async () => {
    try {
      const client = getSupabaseBrowserClient()
      const [nextObligations, nextBatches, nextReferentials] = await Promise.all([loadNdeObligations(client, projectId), loadNdeBatches(client, projectId), loadQualityReferentials(client, projectId)])
      setObligations(nextObligations)
      setBatches(nextBatches)
      setReferentials(nextReferentials)
    } catch (error) {
      toast.error(tb("errors.failedToLoadNdeData"), { description: errorDetail(error) })
    } finally {
      setLoading(false)
    }
  }, [projectId, tb])
  useEffect(() => { void reload() }, [reload])

  // A spool handed over by a blocker link narrows the joints to it; the chip in the page head clears it.
  const visible = useMemo(() => (spoolContext ? obligations.filter((ob) => ob.spoolRevisionId === spoolContext) : obligations), [obligations, spoolContext])
  useNameWorkContext("spool", spoolContext, visible[0]?.spoolNumber)

  const goTab = (next: NdeTab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", next)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }
  const counts: Record<NdeTab, number | null> = {
    joints: visible.length,
    waiting_result: obligations.filter((ob) => jointState(ob) === "waiting_result").length,
    waiting_batch: obligations.filter((ob) => jointState(ob) === "waiting_batch").length,
    closed: batches.filter((batch) => batch.status === "closed" || batch.status === "returned").length,
    summary: null,
  }
  const escalated = batches.filter((batch) => batch.escalatedAt !== null)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <Button variant="outline" onClick={() => goTab("waiting_batch")}>{t("createBatch")}</Button>
      </div>
      {escalated.length > 0 && (
        <ul className="list-disc rounded border border-amber-300 bg-amber-50 p-3 pl-8 text-sm text-amber-900">
          {escalated.map((batch) => (
            <li key={batch.id}>
              {tb.rich("escalatedBatch", {
                batchNumber: batch.batchNumber,
                date: batch.escalatedAt?.slice(0, 10) ?? "—",
                reason: batch.escalationReason === "four_rejections" ? tb("escalationReason.fourRejections") : tb("escalationReason.secondLevelTracer"),
                batch: (chunks) => <span className="font-mono">{chunks}</span>,
              })}
            </li>
          ))}
        </ul>
      )}
      <div role="tablist" className="flex flex-wrap gap-1 border-b">
        {NDE_TABS.map((id) => (
          <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => goTab(id)} className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === id ? "border-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t(`tab.${id}`)}
            {counts[id] !== null && <span className="ml-1.5 rounded bg-muted px-1.5 text-xs">{counts[id]}</span>}
          </button>
        ))}
      </div>
      {loading && tab !== "summary" && <Skeleton className="h-64 w-full" />}
      {!loading && tab === "joints" && <JointsTab obligations={visible} loading={false} />}
      {!loading && tab === "waiting_result" && <WaitingResultTab obligations={obligations} batches={batches} referentials={referentials} onChanged={() => void reload()} />}
      {!loading && tab === "waiting_batch" && <WaitingBatchTab projectId={projectId} obligations={obligations} batches={batches} onChanged={() => void reload()} />}
      {!loading && tab === "closed" && <ClosedTab batches={batches} obligations={obligations} />}
      {tab === "summary" && <SummaryTab projectId={projectId} />}
    </div>
  )
}
