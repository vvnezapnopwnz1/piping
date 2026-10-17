"use client"

// THROWAWAY SPIKE (2026-10-17). Russian only, no tests. One queue: what waits for a result, what waits for a batch.
import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, ChevronRight } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { NdeDashboardScreen } from "./nde-dashboard-screen"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { NDT_METHODS, jointStatusLabel, type NdeBatch, type NdeObligation, type NdtMethod, type CoverageRegime } from "../domain/nde-batch"
import {
  allocateNdeBatchCandidates,
  closeNdeBatch,
  createNdeBatch,
  issueNdeBatch,
  loadJointWelderIds,
  loadNdeBatches,
  loadNdeObligations,
  loadQualityReferentials,
  recordNdeResult,
  type QualityReferentials,
} from "../infrastructure/supabase-quality-repository"

const METHOD_TEXT: Record<string, string> = {
  rt: "Радиографический", ut: "Ультразвуковой", mt: "Магнитопорошковый", pt: "Капиллярный",
  pmi: "Идентификация материала", ht: "Твёрдость", vt: "Визуальный",
}
const REGIME_TEXT: Record<CoverageRegime, string> = { spot: "выборка", mandatory_100: "100 %" }
const today = () => new Date().toISOString().slice(0, 10)
const key = (action: string) => `spike-nde-${action}-${crypto.randomUUID()}`

function statusWords(ob: NdeObligation): string {
  const code = jointStatusLabel(ob)
  if (/^T\d+S$/.test(code)) return `Трассер ${ob.cycleOrdinal}: выбран`
  if (/^T\d+$/.test(code)) return `Трассер ${ob.cycleOrdinal}`
  if (/^R\d+$/.test(code)) return `Ремонт ${ob.cycleOrdinal}`
  return ({ S: "К выбору", SS: "Выбран", NR: "Результат внесён", H: "К контролю", HS: "В контроле" } as Record<string, string>)[code] ?? code
}

const DISPOSITION_TEXT = (ob: NdeObligation) =>
  ob.disposition === "satisfied" ? "Выполнен" : ob.disposition === "issued" ? "Ждёт результата" : ob.batchNumber ? "В партии" : "Ждёт партию"

const JOINT_COLUMNS: DataColumn<NdeObligation>[] = [
  { id: "weld", header: "Стык", value: (ob) => ob.weldNumber, searchable: true, filter: "text", pinned: true, alwaysVisible: true, className: "font-mono font-medium" },
  { id: "spool", header: "Катушка", value: (ob) => ob.spoolNumber, searchable: true, filter: "text", className: "font-mono" },
  { id: "batch", header: "Партия", value: (ob) => ob.batchNumber ?? "—", searchable: true, filter: "select", className: "font-mono" },
  { id: "method", header: "Метод", value: (ob) => METHOD_TEXT[ob.method] ?? ob.method, filter: "select" },
  { id: "state", header: "Состояние", value: (ob) => DISPOSITION_TEXT(ob), filter: "select" },
  { id: "status", header: "Статус стыка", value: (ob) => statusWords(ob), filter: "select" },
  { id: "coverage", header: "Объём", numeric: true, value: (ob) => `${ob.requiredCoverage} %` },
]

const TABS = ["joints", "waiting_result", "waiting_batch", "closed", "summary"] as const
type Tab = (typeof TABS)[number]

export function SpikeNdeNext({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const tab: Tab = TABS.find((candidate) => candidate === searchParams.get("tab")) ?? "joints"
  const goTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", next)
    router.replace(`${pathname}?${params.toString()}`)
  }
  const [obligations, setObligations] = useState<NdeObligation[]>([])
  const [batches, setBatches] = useState<NdeBatch[]>([])
  const [refs, setRefs] = useState<QualityReferentials | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [date, setDate] = useState(today())
  const [report, setReport] = useState("")
  const [creating, setCreating] = useState(false)
  const [method, setMethod] = useState<NdtMethod>("rt")
  const [regime, setRegime] = useState<CoverageRegime>("spot")
  const [percent, setPercent] = useState("10")
  const [reject, setReject] = useState<{ ob: NdeObligation; code: string; welder: string; welders: string[] } | null>(null)
  const [jointTable, setJointTable] = useTableUrlState({ namespace: "nx" })

  const reload = useCallback(async () => {
    const client = getSupabaseBrowserClient()
    const [obs, bs] = await Promise.all([loadNdeObligations(client, projectId), loadNdeBatches(client, projectId)])
    setObligations(obs)
    setBatches(bs)
  }, [projectId])
  useEffect(() => { void reload() }, [reload])
  useEffect(() => { void loadQualityReferentials(getSupabaseBrowserClient(), projectId).then(setRefs) }, [projectId])

  const run = async (label: string, work: () => Promise<void>) => {
    setBusy(label); setMessage(null)
    try { await work(); await reload() } catch (error) { setMessage(error instanceof Error ? error.message : "Не удалось выполнить действие") } finally { setBusy(null) }
  }

  const byBatch = useMemo(() => {
    const map = new Map<string, NdeObligation[]>()
    for (const ob of obligations) if (ob.batchNumber) map.set(ob.batchNumber, [...(map.get(ob.batchNumber) ?? []), ob])
    return map
  }, [obligations])
  const waitingForBatch = obligations.filter((ob) => ob.disposition === "pending" && !ob.batchNumber)
  const groups = useMemo(() => {
    const map = new Map<string, NdeObligation[]>()
    for (const ob of waitingForBatch) map.set(`${ob.method}|${ob.coverageRegime}`, [...(map.get(`${ob.method}|${ob.coverageRegime}`) ?? []), ob])
    return [...map.entries()]
  }, [waitingForBatch])
  const inWork = batches.filter((b) => b.status === "issued")
  const drafts = batches.filter((b) => b.status === "draft")
  const closed = batches.filter((b) => b.status === "closed" || b.status === "returned")

  const create = (m: NdtMethod, r: CoverageRegime, pct: number) =>
    run("create", async () => {
      const client = getSupabaseBrowserClient()
      const batch = await createNdeBatch(client, projectId, m, r, null, null, key("create"))
      await allocateNdeBatchCandidates(client, batch.id, pct, key("allocate"))
      await issueNdeBatch(client, batch.id, key("issue"))
      setCreating(false)
      setMessage(`Партия ${batch.batchNumber} создана и выдана`)
    })

  const acceptPicked = (batchObs: NdeObligation[]) =>
    run("accept", async () => {
      const client = getSupabaseBrowserClient()
      const chosen = batchObs.filter((ob) => picked.has(ob.id))
      for (const [i, ob] of chosen.entries()) {
        await recordNdeResult(client, ob.id, "accepted", date, report ? `${report}-${i + 1}` : null, null, null, key(`accept-${ob.id}`))
      }
      setPicked(new Set())
      setMessage(`Принято стыков: ${chosen.length}`)
    })

  const startReject = async (ob: NdeObligation) => {
    const ids = await loadJointWelderIds(getSupabaseBrowserClient(), ob.weldJointRevisionId)
    setReject({ ob, code: "", welder: "", welders: ids })
  }
  const saveReject = () => {
    if (!reject || !reject.code) return
    return run("reject", async () => {
      await recordNdeResult(getSupabaseBrowserClient(), reject.ob.id, "rejected", date, report || null, reject.code, reject.welder || null, key(`reject-${reject.ob.id}`))
      setReject(null)
      setMessage(`Брак записан: ${reject.ob.weldNumber}. Создан ремонт и трассеры`)
    })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Неразрушающий контроль</h1>
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">черновик</span>
        </div>
        <Button variant="outline" onClick={() => setCreating((v) => !v)}>Создать партию</Button>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 border-b">
        {([
          ["joints", "Стыки", obligations.length],
          ["waiting_result", "Ждут результата", inWork.reduce((n, b) => n + (byBatch.get(b.batchNumber) ?? []).filter((o) => o.disposition === "issued").length, 0)],
          ["waiting_batch", "Ждут партию", waitingForBatch.length],
          ["closed", "Закрытые партии", closed.length],
          ["summary", "Сводка", null],
        ] as const).map(([id, label, count]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            type="button"
            onClick={() => goTab(id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === id ? "border-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {label}{count !== null && <span className="ml-1.5 rounded bg-muted px-1.5 text-xs">{count}</span>}
          </button>
        ))}
      </div>

      {creating && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
          <label className="text-sm">Метод
            <select className="mt-1 block rounded border bg-transparent p-2" value={method} onChange={(e) => setMethod(e.target.value as NdtMethod)}>
              {NDT_METHODS.map((m) => <option key={m} value={m}>{METHOD_TEXT[m]}</option>)}
            </select>
          </label>
          <label className="text-sm">Режим
            <select className="mt-1 block rounded border bg-transparent p-2" value={regime} onChange={(e) => { setRegime(e.target.value as CoverageRegime); setPercent(e.target.value === "spot" ? "10" : "100") }}>
              <option value="spot">выборка</option><option value="mandatory_100">100 %</option>
            </select>
          </label>
          <label className="text-sm">Процент
            <input className="mt-1 block w-20 rounded border bg-transparent p-2" value={percent} onChange={(e) => setPercent(e.target.value)} />
          </label>
          <Button disabled={busy !== null} onClick={() => void create(method, regime, Number(percent))}>Создать и выдать</Button>
        </div>
      )}
      {message && <p className="rounded border bg-muted px-3 py-2 text-sm">{message}</p>}

      {tab === "waiting_result" && <section className="space-y-2">
        {inWork.length === 0 && <p className="rounded-lg border p-4 text-sm text-muted-foreground">Выданных партий нет</p>}
        {inWork.map((b) => {
          const all = byBatch.get(b.batchNumber) ?? []
          const waiting = all.filter((o) => o.disposition === "issued")
          const doneCount = all.length - waiting.length
          const isOpen = open[b.id] ?? inWork.length === 1
          const pickedHere = waiting.filter((o) => picked.has(o.id))
          return (
            <div key={b.id} className="rounded-lg border bg-card">
              <button type="button" onClick={() => setOpen({ ...open, [b.id]: !isOpen })} className={`flex w-full items-center justify-between gap-3 p-3 text-left ${isOpen ? "sticky top-0 z-10 rounded-t-lg bg-primary text-primary-foreground" : ""}`}>
                <span><span className="font-mono font-medium">{b.batchNumber}</span> <span className="ml-2 text-sm opacity-80">{METHOD_TEXT[b.method]} · {REGIME_TEXT[b.coverageRegime]}</span></span>
                <span className="flex items-center gap-2 text-sm">{doneCount} из {all.length} с результатом {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
              </button>
              {isOpen && (
                <div className="space-y-2 p-3">
                  <div className="flex flex-wrap items-end gap-2 border-b pb-3">
                    <label className="text-sm">Дата контроля<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ml-2 rounded border bg-transparent p-1.5" /></label>
                    <label className="text-sm">№ заключения<input value={report} onChange={(e) => setReport(e.target.value)} className="ml-2 w-40 rounded border bg-transparent p-1.5" /></label>
                    <Button size="sm" variant="outline" onClick={() => setPicked(new Set([...picked, ...waiting.map((o) => o.id)]))}>Отметить все ({waiting.length})</Button>
                    <Button size="sm" disabled={pickedHere.length === 0 || busy !== null} onClick={() => void acceptPicked(waiting)}>Принять отмеченные ({pickedHere.length})</Button>
                    {waiting.length === 0 && <Button size="sm" disabled={busy !== null} onClick={() => void run("close", () => closeNdeBatch(getSupabaseBrowserClient(), b.id, key("close")))}>Закрыть партию</Button>}
                  </div>
                  {waiting.map((ob) => (
                    <div key={ob.id} className="flex items-center gap-3 rounded border px-3 py-1.5 text-sm">
                      <input type="checkbox" checked={picked.has(ob.id)} onChange={(e) => { const next = new Set(picked); if (e.target.checked) next.add(ob.id); else next.delete(ob.id); setPicked(next) }} />
                      <span className="w-40 font-mono">{ob.weldNumber}</span>
                      <span className="flex-1 text-muted-foreground">{ob.spoolNumber} · {statusWords(ob)}</span>
                      <Button size="sm" variant="outline" onClick={() => void startReject(ob)}>Брак…</Button>
                    </div>
                  ))}
                  {waiting.length === 0 && <p className="flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" /> Все стыки партии с результатом</p>}
                </div>
              )}
            </div>
          )
        })}
      </section>}

      {tab === "waiting_result" && reject && refs && (
        <div className="space-y-2 rounded-lg border border-destructive bg-card p-3">
          <p className="text-sm font-medium">Брак: {reject.ob.weldNumber}</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">Код дефекта
              <select className="mt-1 block rounded border bg-transparent p-2" value={reject.code} onChange={(e) => setReject({ ...reject, code: e.target.value })}>
                <option value="">выберите</option>
                {refs.reworkCodes.map((c) => <option key={c.id} value={c.id}>{c.code} {c.description ?? ""}</option>)}
              </select>
            </label>
            <label className="text-sm">Виновный сварщик
              <select className="mt-1 block rounded border bg-transparent p-2" value={reject.welder} onChange={(e) => setReject({ ...reject, welder: e.target.value })}>
                <option value="">не указан</option>
                {refs.welders.filter((w) => reject.welders.includes(w.id)).map((w) => <option key={w.id} value={w.id}>{w.welderCode} {w.fullName ?? ""}</option>)}
              </select>
            </label>
            <Button size="sm" disabled={!reject.code || busy !== null} onClick={() => void saveReject()}>Записать брак</Button>
            <Button size="sm" variant="outline" onClick={() => setReject(null)}>Отмена</Button>
          </div>
        </div>
      )}

      {tab === "waiting_batch" && <section className="space-y-2">
        {groups.length === 0 && drafts.length === 0 && <p className="rounded-lg border p-4 text-sm text-muted-foreground">Все стыки уже в партиях</p>}
        {groups.map(([groupKey, items]) => {
          const [m, r] = groupKey.split("|") as [NdtMethod, CoverageRegime]
          return (
            <div key={groupKey} className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
              <span>{METHOD_TEXT[m]} · {REGIME_TEXT[r]}: <b>{items.length}</b> стыков</span>
              <Button size="sm" disabled={busy !== null} onClick={() => void create(m, r, r === "spot" ? 10 : 100)}>Создать партию {r === "spot" ? "(10 %)" : "(100 %)"}</Button>
            </div>
          )
        })}
        {drafts.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
            <span className="font-mono">{b.batchNumber} <Badge variant="outline">черновик</Badge></span>
            <Button size="sm" disabled={busy !== null} onClick={() => void run("issue", async () => { const c = getSupabaseBrowserClient(); await allocateNdeBatchCandidates(c, b.id, b.coverageRegime === "spot" ? 10 : 100, key("allocate")); await issueNdeBatch(c, b.id, key("issue")) })}>Выдать</Button>
          </div>
        ))}
      </section>}

      {tab === "joints" && <section className="space-y-2">
        
        <DataTable
          columns={JOINT_COLUMNS}
          rows={obligations}
          state={jointTable}
          onStateChange={setJointTable}
          rowId={(ob) => ob.id}
          searchPlaceholder="Поиск по стыку, катушке или партии"
          emptyTitle="Стыков нет"
          emptyDescription="Стыки появляются, когда сварены и подпадают под правило контроля"
        />
      </section>}

      {tab === "closed" && (
        <section>
          <ul className="space-y-1 text-sm">
            {closed.map((b) => <li key={b.id} className="flex justify-between rounded border px-3 py-1.5"><span className="font-mono">{b.batchNumber}</span><span className="text-muted-foreground">{METHOD_TEXT[b.method]} · {REGIME_TEXT[b.coverageRegime]} · {(byBatch.get(b.batchNumber) ?? []).length} стыков · {b.closedOn ?? b.issuedOn ?? ""}</span></li>)}
          </ul>
        </section>
      )}

      {tab === "summary" && <NdeDashboardScreen projectId={projectId} />}
    </div>
  )
}
