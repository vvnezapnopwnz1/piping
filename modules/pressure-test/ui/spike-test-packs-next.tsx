"use client"

// THROWAWAY SPIKE (2026-10-17). Russian only, no tests, reuses the existing step screens inside each step.
import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, ChevronRight, Circle, Lock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import {
  listTestPackCatalog,
  listTestPackMembers,
  type TestPackCatalogRow,
  type TestPackMemberRow,
} from "../infrastructure/supabase-pressure-test-repository"
import { PressureTestProgressScreen } from "./pressure-test-progress-screen"
import { RequestPreparationScreen } from "./request-preparation-screen"
import { TestPackCompositionEditor } from "./test-pack-composition-editor"
import type { Json } from "@/lib/supabase/database.types"

type Workflow = Record<string, unknown> & { test_pack_id: string }

const STAGE_TEXT: Record<string, string> = {
  awaiting_rft: "Ждёт готовности",
  blinding_assigned: "Заглушки",
  blinded: "Готов к испытанию",
  testing: "Идёт испытание",
  awaiting_y_reinstatement: "Ждёт обратной сборки Y",
  ready_for_precommissioning: "Ждёт пусконаладки",
  awaiting_z_reinstatement: "Ждёт обратной сборки Z",
  complete: "Завершён",
}
const FILTERS = [
  ["all", "Все"],
  ["waiting", "Ждут готовности"],
  ["active", "В работе"],
  ["done", "Завершены"],
] as const
const group = (stage: string) => (stage === "awaiting_rft" ? "waiting" : stage === "complete" ? "done" : "active")

const RFT_REASON: Record<string, string> = {
  NO_SPOOLS: "нет катушек",
  WELD_OR_SUPPORT_PENDING: "не сварено или нет опор",
  FLANGE_PENDING: "фланцы не собраны",
  NDE_PENDING: "ждёт контроля неразрушающего",
  PWHT_PENDING: "ждёт термообработки",
  LINE_CHECK_PENDING: "проверка линии не завершена",
  X_OPEN: "открыты замечания X",
}
const WAIT_REASON: Record<string, string> = {
  rft_pending: "пакет ещё не готов к испытанию",
  blinding_pending: "ждёт заглушек",
  testing_pending: "ждёт испытания",
  y_reinstatement_pending: "ждёт обратной сборки Y",
  precommissioning_pending: "ждёт пусконаладки",
}

type StepState = "done" | "ready" | "ongoing" | "blocked" | "off"
interface Step {
  id: string
  title: string
  state: StepState
  summary: string
  reason?: string
  ops?: { prep?: "line_check" | "item_clearance" | "blinding" | "reinstatement"; progress?: "line_check" | "item_clearance" | "blinding" | "testing_precomm" | "reinstatement" }
}

const num = (row: Workflow, key: string) => Number(row[key] ?? 0)
const mapState = (value: unknown): StepState =>
  value === "completed" ? "done" : value === "ready" ? "ready" : value === "ongoing" ? "ongoing" : value === "not_applicable" ? "off" : "blocked"

function stepsOf(row: Workflow): Step[] {
  const blockers = (row.blockers ?? {}) as Record<string, Json>
  const waits = (key: string) => ((blockers[key] as string[] | undefined) ?? []).map((code) => WAIT_REASON[code] ?? code).join(", ")
  const rftReasons = Object.entries((blockers.rft ?? {}) as Record<string, number>).filter(([, n]) => n > 0).map(([code, n]) => `${RFT_REASON[code] ?? code}: ${n}`).join(", ")
  const lcTotal = num(row, "line_check_total"), lcDone = num(row, "line_check_completed")
  const icTotal = num(row, "item_clearance_total"), icDone = num(row, "item_clearance_cleared")
  return [
    { id: "composition", title: "Состав", state: "done", summary: "изометрики пакета" },
    {
      id: "readiness", title: "Готовность к испытанию", state: mapState(row.rft_state),
      summary: row.rft_state === "completed" ? `готов с ${row.rft_on ?? "—"}` : rftReasons || "условия не выполнены", reason: rftReasons,
    },
    {
      id: "line_check", title: "Проверка линии", state: lcTotal === 0 ? "ready" : lcDone === lcTotal ? "done" : "ongoing",
      summary: lcTotal === 0 ? "ещё не назначена" : `${lcDone} из ${lcTotal} изометрик`, ops: { prep: "line_check", progress: "line_check" },
    },
    ...(icTotal > 0
      ? [{ id: "item_clearance", title: "Замечания X", state: (icDone === icTotal ? "done" : "ongoing") as StepState, summary: `${icDone} из ${icTotal} закрыто`, ops: { prep: "item_clearance", progress: "item_clearance" } } as Step]
      : []),
    { id: "blinding", title: "Заглушки", state: mapState(row.blinding_state), summary: row.blinding_completed ? `установлены ${row.blinding_completed_on ?? ""}` : "", reason: waits("blinding"), ops: { prep: "blinding", progress: "blinding" } },
    { id: "testing", title: "Испытание", state: mapState(row.testing_state), summary: row.testing_completed ? `завершено ${row.testing_completed_on ?? ""}` : row.testing_started ? `начато ${row.testing_started_on ?? ""}` : "", reason: waits("testing"), ops: { progress: "testing_precomm" } },
    { id: "y", title: "Обратная сборка Y", state: mapState(row.y_state), summary: `${num(row, "y_completed_count")} из ${num(row, "y_target_count")} соединений`, reason: waits("y_reinstatement"), ops: { prep: "reinstatement", progress: "reinstatement" } },
    { id: "precomm", title: "Пусконаладка", state: mapState(row.precomm_state), summary: row.precommissioned ? `завершена ${row.precommissioning_completed_on ?? ""}` : "", reason: waits("precommissioning"), ops: { progress: "testing_precomm" } },
    { id: "z", title: "Обратная сборка Z", state: mapState(row.z_state), summary: `${num(row, "z_completed_count")} из ${num(row, "z_target_count")} соединений`, reason: waits("z_reinstatement"), ops: { prep: "reinstatement", progress: "reinstatement" } },
  ].filter((step) => step.state !== "off") as Step[]
}

export function SpikeTestPacksNext({ projectId }: { projectId: string }) {
  const access = useOptionalAccess()
  const canManage = access?.can("testpack.manage") ?? false
  const [packs, setPacks] = useState<TestPackCatalogRow[]>([])
  const [workflows, setWorkflows] = useState<Record<string, Workflow>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all")
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<string | null>(null)
  const [members, setMembers] = useState<TestPackMemberRow[]>([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const client = getSupabaseBrowserClient()
    void Promise.all([
      listTestPackCatalog(client, projectId),
      client.from("test_pack_workflow").select("*").eq("project_id", projectId),
    ]).then(([catalog, wf]) => {
      setPacks(catalog)
      setWorkflows(Object.fromEntries(((wf.data ?? []) as unknown as Workflow[]).map((row) => [row.test_pack_id, row])))
      setSelected((current) => current ?? catalog[0]?.id ?? null)
    })
  }, [projectId, version])

  useEffect(() => {
    if (!selected) return
    void listTestPackMembers(getSupabaseBrowserClient(), projectId, selected).then(setMembers)
  }, [projectId, selected, version])

  const refresh = useCallback(() => setVersion((v) => v + 1), [])
  const pack = packs.find((candidate) => candidate.id === selected) ?? null
  const row = selected ? workflows[selected] : undefined
  const steps = useMemo(() => (row ? stepsOf(row) : []), [row])
  const current = steps.find((step) => step.state !== "done")?.id ?? null
  useEffect(() => setOpen(current), [selected, current])

  const stageOf = (id: string) => String(workflows[id]?.canonical_state ?? "awaiting_rft")
  const visible = packs.filter((p) => (filter === "all" || group(stageOf(p.id)) === filter) && p.testPackNumber.toLowerCase().includes(query.toLowerCase()))
  const counts = (key: string) => (key === "all" ? packs.length : packs.filter((p) => group(stageOf(p.id)) === key).length)

  return (
    <div className="grid h-[calc(100dvh-150px)] min-h-[420px] grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
      <aside className="flex min-h-0 flex-col rounded-lg border bg-card">
        <div className="space-y-2 border-b p-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Тест-пакеты</h1>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">черновик</span>
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Номер пакета" className="h-9 w-full rounded border bg-transparent px-3 text-sm" />
          <div className="flex flex-wrap gap-1">
            {FILTERS.map(([key, label]) => (
              <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(key)}>
                {label} {counts(key)}
              </Button>
            ))}
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {visible.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setSelected(p.id)} className={`flex w-full items-center justify-between gap-2 border-b px-3 py-2.5 text-left hover:bg-muted ${p.id === selected ? "bg-muted" : ""}`}>
                <span>
                  <span className="block font-mono text-sm font-medium">{p.testPackNumber}</span>
                  <span className="block text-xs text-muted-foreground">{p.activeIsoCount} изометрик · {p.location ?? ""}</span>
                </span>
                <Badge variant={group(stageOf(p.id)) === "waiting" ? "secondary" : "default"}>{STAGE_TEXT[stageOf(p.id)] ?? stageOf(p.id)}</Badge>
              </button>
            </li>
          ))}
          {visible.length === 0 && <li className="p-4 text-sm text-muted-foreground">Пакетов нет</li>}
        </ul>
      </aside>

      <section className="min-h-0 overflow-y-auto rounded-lg border bg-card">
        {!pack || !row ? (
          <p className="p-6 text-sm text-muted-foreground">Выберите пакет слева</p>
        ) : (
          <>
            <header className="sticky top-0 z-20 flex h-[76px] flex-wrap items-center justify-between gap-2 border-b bg-card px-4">
              <div>
                <h2 className="font-mono text-xl font-semibold">{pack.testPackNumber}</h2>
                <p className="text-sm text-muted-foreground">{pack.activeIsoCount} изометрик · {STAGE_TEXT[stageOf(pack.id)]}</p>
              </div>
            </header>
            <ol className="space-y-2 p-4">
              {steps.map((step, index) => {
                const isOpen = open === step.id
                return (
                  <li key={step.id} className={`rounded-lg border ${step.id === current ? "border-primary" : ""}`}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : step.id)}
                      className={`flex w-full items-center gap-3 p-3 text-left ${isOpen ? `sticky top-[76px] z-10 rounded-t-lg shadow-sm ${step.id === current ? "bg-primary text-primary-foreground" : "bg-emerald-700 text-white"}` : ""}`}
                    >
                      <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border text-xs ${isOpen ? "border-white/60 bg-white" : ""}`}>
                        {step.state === "done" ? <Check className="h-4 w-4 text-emerald-600" /> : step.state === "blocked" ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : step.id === current ? <Circle className="h-3 w-3 fill-primary text-primary" /> : index + 1}
                      </span>
                      <span className={`flex-1 ${step.state === "blocked" && !isOpen ? "text-muted-foreground" : ""}`}>
                        <span className="font-medium">{step.title}</span>
                        <span className={`ml-2 text-sm ${isOpen ? "opacity-80" : "text-muted-foreground"}`}>{step.state === "blocked" && step.reason ? step.reason : step.summary}</span>
                      </span>
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    {isOpen && (
                      <div className="space-y-4 border-t p-3">
                        {step.id === "composition" && (
                          <TestPackCompositionEditor projectId={projectId} pack={pack} canManage={canManage} dataCurrent onComposed={refresh} />
                        )}
                        {step.id === "readiness" && (
                          <div className="space-y-1 text-sm">
                            {step.reason && <p className="text-muted-foreground">Что мешает: {step.reason}</p>}
                            {members.filter((m) => m.removed_at === null).map((m) => (
                              <div key={m.isometric_id} className="flex justify-between rounded border px-3 py-1.5">
                                <span className="font-mono">{m.iso_number}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {step.ops?.prep && step.state !== "blocked" && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Назначить</p>
                            <RequestPreparationScreen requestType={step.ops.prep} embedded testPackId={pack.id} onRecorded={refresh} />
                          </div>
                        )}
                        {step.ops?.progress && step.state !== "blocked" && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Записать результат</p>
                            <PressureTestProgressScreen requestType={step.ops.progress} embedded testPackId={pack.id} onRecorded={refresh} />
                          </div>
                        )}
                        {step.state === "blocked" && step.id !== "readiness" && <p className="text-sm text-muted-foreground">{step.reason || "Пока недоступно"}</p>}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </section>
    </div>
  )
}
