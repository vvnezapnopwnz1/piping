"use client"

import { useTestPackTranslations, reportTestPackError } from "@/modules/pressure-test/ui/test-pack-i18n"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { listTestPackReadiness, listTestPackStageStates, type TestPackReadinessRow, type TestPackStageStates } from "../infrastructure/supabase-pressure-test-repository"
import type { PressureTestState } from "../domain/pressure-test-workflow"
import { summarizeWorkflow } from "./pressure-test-ui-model"
import { buildTestPackHref } from "./test-pack-workspace-model"

type DashboardRow = { label: string; ready: number; ongoing: number; done: number; blocked: number }

/** The server's state of each stage for every pack; the dashboard only counts them (manual 17: Ready, Ongoing). */
const STAGES: readonly { label: "text.stageRft" | "text.blinding" | "text.testing" | "text.stageYReinstatement" | "text.stagePrecommissioning" | "text.stageZReinstatement"; state: keyof TestPackStageStates }[] = [
  { label: "text.stageRft", state: "rft_state" },
  { label: "text.blinding", state: "blinding_state" },
  { label: "text.testing", state: "testing_state" },
  { label: "text.stageYReinstatement", state: "y_state" },
  { label: "text.stagePrecommissioning", state: "precomm_state" },
  { label: "text.stageZReinstatement", state: "z_state" },
]

export function TestPackDashboard({ projectId }: { projectId: string }) {
  const t = useTestPackTranslations()

  const [rows, setRows] = useState<TestPackReadinessRow[]>([])
  const [states, setStates] = useState<TestPackStageStates[]>([])
  const [filter, setFilter] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setRows([])
    setStates([])
    setError(null)
    setLoading(true)
    const client = getSupabaseBrowserClient()
    void Promise.all([listTestPackReadiness(client, projectId), listTestPackStageStates(client, projectId)]).then(([packs, stageStates]) => {
      if (!active) return
      setRows(packs)
      setStates(stageStates)
      setError(null)
    }).catch((cause) => { if (active) setError(reportTestPackError(cause, t("text.couldNotLoadTestPacks"))) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId])

  const stageById = useMemo(() => new Map(states.map((row) => [row.test_pack_id ?? "", row.canonical_state ?? "awaiting_rft"])), [states])
  const stageLabelFor = (id: string) => t(summarizeWorkflow({ canonicalState: (stageById.get(id) ?? "awaiting_rft") as PressureTestState }).label)
  const visibleRows = useMemo(() => rows.filter((row) => (row.test_pack_number ?? "").toLowerCase().includes(filter.toLowerCase())), [filter, rows])
  const stages: DashboardRow[] = STAGES.map(({ label, state }) => {
    const count = (value: string) => states.filter((row) => row[state] === value).length
    return { label: t(label), ready: count("ready"), ongoing: count("ongoing"), done: count("completed"), blocked: count("blocked") }
  })
  const awaitingRft = states.filter((row) => row.canonical_state === "awaiting_rft").length
  const complete = states.filter((row) => row.canonical_state === "complete").length

  if (error) return <p className="text-sm text-destructive">{error}</p>
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">{t("text.testPacks")}</h1><p className="text-sm text-muted-foreground">{t("text.databaseBackedReleaseTrackingAndPressureTestWorkflow")}</p></div><div className="flex gap-3 text-sm"><Link className="underline" href="/testpack/builder">{t("text.builder")}</Link><Link className="underline" href="/testpack/explorer">{t("text.explorer")}</Link></div></div>
    <div className="grid gap-4 sm:grid-cols-4"><Card><CardHeader><CardTitle className="text-sm">{t("text.awaitingRft")}</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{loading ? "…" : awaitingRft}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">{t("text.inPressureTest")}</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{loading ? "…" : states.length - awaitingRft - complete}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">{t("text.complete")}</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{loading ? "…" : complete}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">{t("text.visiblePacks")}</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{loading ? "…" : rows.length}</CardContent></Card></div>
    <Card><CardHeader><CardTitle>{t("text.workflowByStage")}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">{stages.map((stage) => <Link key={stage.label} href="/testpack/explorer" className="rounded border p-3 hover:bg-muted"><div className="text-sm font-medium">{stage.label}</div><div className="mt-2 text-xs text-muted-foreground">{t("text.readyStage")}: {stage.ready} · {t("text.ongoingStage")}: {stage.ongoing}</div><div className="mt-1 text-xs text-muted-foreground">{t("text.done")}: {stage.done} · {t("text.blockedStage")}: {stage.blocked}</div></Link>)}</CardContent></Card>
    <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>{t("text.releaseBacklog")}</CardTitle><input aria-label={t("text.filterTestPacks")} value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={t("text.filterNumber")} className="h-9 rounded border bg-transparent px-3 text-sm" /></CardHeader><CardContent className="space-y-2">{visibleRows.map((row) => <Link key={row.testPackId} href={buildTestPackHref({ href: "/testpack/explorer", testPackId: row.testPackId, view: "readiness" })} className="flex justify-between rounded border p-3 text-sm hover:bg-muted"><span>{row.test_pack_number} <span className="text-muted-foreground">{t("text.packMeta", { revision: row.revision_no ?? 0, count: row.member_count ?? 0 })}</span></span><span>{stageLabelFor(row.testPackId)}</span></Link>)}{!loading && visibleRows.length === 0 && <p className="text-sm text-muted-foreground">{t("text.noTestPacksAreVisibleInThisProject")}</p>}</CardContent></Card>
  </div>
}
