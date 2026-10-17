"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { packStageGroup } from "../domain/pack-steps"
import type { TestPackCatalogRow } from "../infrastructure/supabase-pressure-test-repository"
import { useTestPackTranslations } from "./test-pack-i18n"

const FILTERS = ["all", "waiting", "active", "done"] as const
type Filter = (typeof FILTERS)[number]

export function TestPackList({
  packs,
  stages,
  selectedId,
  onSelect,
  onCreate,
  canManage,
}: {
  packs: readonly TestPackCatalogRow[]
  stages: Record<string, string>
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  canManage: boolean
}) {
  const t = useTestPackTranslations()
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  const stageOf = (id: string) => stages[id] ?? "awaiting_rft"
  const visible = packs.filter((pack) => (filter === "all" || packStageGroup(stageOf(pack.id)) === filter) && pack.testPackNumber.toLowerCase().includes(query.toLowerCase()))
  const counted = (key: Filter) => (key === "all" ? packs.length : packs.filter((pack) => packStageGroup(stageOf(pack.id)) === key).length)
  return (
    <aside className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card">
      <div className="space-y-2 border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">{t("screen.title")}</h1>
          {canManage && <Button size="sm" onClick={onCreate}>{t("screen.newPack")}</Button>}
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("screen.searchPlaceholder")} aria-label={t("screen.searchPlaceholder")} className="h-9 w-full rounded border bg-transparent px-3 text-sm" />
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((key) => (
            <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(key)}>
              {t(`screen.filter.${key}`)} {counted(key)}
            </Button>
          ))}
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {visible.map((pack) => (
          <li key={pack.id}>
            <button type="button" onClick={() => onSelect(pack.id)} className={`flex w-full items-center justify-between gap-2 border-b px-3 py-2.5 text-left hover:bg-muted ${pack.id === selectedId ? "bg-muted" : ""}`}>
              <span>
                <span className="block font-mono text-sm font-medium">{pack.testPackNumber}</span>
                <span className="block text-xs text-muted-foreground">{t("screen.isoCount", { count: pack.activeIsoCount })}{pack.location ? ` · ${pack.location}` : ""}</span>
              </span>
              <Badge variant={packStageGroup(stageOf(pack.id)) === "waiting" ? "secondary" : "default"}>{t(`screen.stage.${stageOf(pack.id)}`)}</Badge>
            </button>
          </li>
        ))}
        {visible.length === 0 && <li className="p-4 text-sm text-muted-foreground">{t("screen.noPacks")}</li>}
      </ul>
    </aside>
  )
}
