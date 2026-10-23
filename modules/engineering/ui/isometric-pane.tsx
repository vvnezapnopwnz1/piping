"use client"

import { useLocale, useTranslations } from "next-intl"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { errorDetail, formatMoment } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"

import { loadRevisionDetail, loadRevisionHistory, type IsometricRow, type RevisionDetail, type RevisionSummary, type SpoolDetail } from "../infrastructure/supabase-engineering-repository"
import { SpoolContentsDrawer } from "./spool-contents-drawer"

/** Items a revision still holds; a removed weld is shown and struck through, never counted. */
const kept = (items: ReadonlyArray<{ isRemoved: boolean }>) => items.filter((item) => !item.isRemoved).length

/**
 * One isometric: which revision is being read, where that revision sits in the drawing, what it
 * carries in total, and its spools as a table. `revisionId === null` means the iso's current
 * revision, so the pane opens on what the list shows.
 */
export function IsometricPane({ iso, revisionId, onRevisionChange, spoolRevisionId, onOpenSpool }: {
  iso: IsometricRow
  revisionId: string | null
  onRevisionChange: (id: string) => void
  spoolRevisionId: string | null
  onOpenSpool: (spool: SpoolDetail | null) => void
}) {
  const t = useTranslations("spooling")
  const locale = useLocale()
  const [history, setHistory] = useState<RevisionSummary[]>([])
  const [detail, setDetail] = useState<RevisionDetail | null>(null)
  const [table, setTable] = useTableUrlState({ namespace: "isoSpool" })
  // A `rev` this isometric does not have is a stale link, not a revision: the current one wins.
  const known = revisionId && (history.length === 0 || history.some((revision) => revision.id === revisionId)) ? revisionId : null
  const shownId = known ?? iso.revisionId

  useEffect(() => {
    let live = true
    void loadRevisionHistory(getSupabaseBrowserClient(), iso.id)
      .then((rows) => { if (live) setHistory(rows) })
      .catch((e) => { if (live) toast.error(t("browser.historyFailed"), { description: errorDetail(e) }) })
    return () => { live = false }
  }, [iso.id, t])

  useEffect(() => {
    if (!shownId) return
    let live = true
    void loadRevisionDetail(getSupabaseBrowserClient(), shownId)
      .then((row) => { if (live) setDetail(row) })
      .catch((e) => { if (live) toast.error(t("browser.revisionFailed"), { description: errorDetail(e) }) })
    return () => { live = false }
  }, [shownId, t])

  // The revision being read, never the one that was open before it: loading is derived, not stored.
  const current = detail && detail.id === shownId ? detail : null
  const loading = Boolean(shownId) && !current
  const spools = current?.spools ?? []
  const shown = history.find((revision) => revision.id === shownId) ?? null
  const revisionNumber = shown?.revisionNumber ?? iso.revisionNumber
  const status = shown?.status ?? iso.revisionStatus

  const columns = useMemo<DataColumn<SpoolDetail>[]>(() => {
    const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
    const muted = (spool: SpoolDetail, value: ReactNode) => <span className={spool.isRemoved ? "text-muted-foreground" : undefined}>{value}</span>
    // A count of what the spool still holds; a removed spool is marked, not hidden.
    const counted = (id: "welds" | "supports" | "flanges" | "materials", of: (spool: SpoolDetail) => number): DataColumn<SpoolDetail> => ({
      id,
      header: t(`browser.spoolColumn.${id}`),
      value: of,
      numeric: true,
      cell: (spool) => muted(spool, numbers.format(of(spool))),
    })
    return [
      {
        id: "spool",
        header: t("browser.spoolColumn.spool"),
        value: (spool) => spool.spoolNumber,
        searchable: true,
        alwaysVisible: true,
        cell: (spool) => (
          <span className={`font-mono text-xs ${spool.isRemoved ? "text-muted-foreground" : ""}`}>
            {spool.spoolNumber}{spool.isRemoved ? <Badge variant="outline" className="ml-2">{t("browser.removed")}</Badge> : null}
          </span>
        ),
      },
      counted("welds", (spool) => kept(spool.welds)),
      counted("supports", (spool) => kept(spool.supports)),
      counted("flanges", (spool) => kept(spool.flanges)),
      counted("materials", (spool) => spool.materials.length),
      {
        id: "weight",
        header: t("browser.spoolColumn.weight"),
        value: (spool) => spool.weightKg,
        numeric: true,
        cell: (spool) => muted(spool, spool.weightKg === null ? "—" : numbers.format(spool.weightKg)),
      },
      {
        id: "materialClass",
        header: t("browser.spoolColumn.materialClass"),
        value: (spool) => spool.materialClass,
        cell: (spool) => muted(spool, spool.materialClass ?? "—"),
      },
    ]
  }, [locale, t])

  if (!iso.revisionId) {
    return (
      <section className="space-y-3">
        <h2 className="font-mono text-lg font-semibold">{iso.isoNumber}</h2>
        <p className="text-muted-foreground text-sm">{t("browser.noSpools")}</p>
      </section>
    )
  }

  const held = spools.filter((spool) => !spool.isRemoved)
  const welds = held.flatMap((spool) => spool.welds).filter((weld) => !weld.isRemoved)
  const facts = [
    current?.lineNumber ? t("browser.line", { value: current.lineNumber }) : null,
    current?.sheetNumber ? t("browser.sheet", { value: current.sheetNumber }) : null,
    current?.areaCode ? t("browser.area", { value: current.areaCode }) : null,
    current?.serviceClassCode ? t("browser.serviceClass", { value: current.serviceClassCode }) : null,
    current?.acceptedAt ? t("browser.acceptedOn", { date: formatMoment(current.acceptedAt, locale) }) : null,
  ].filter((fact): fact is string => Boolean(fact))
  const summary = [
    t("browser.spoolCount", { count: held.length }),
    `${t("browser.weldCount", { count: welds.length })} (${t("browser.weldSplit", { shop: welds.filter((weld) => weld.location === "shop").length, field: welds.filter((weld) => weld.location === "field").length })})`,
    t("browser.supportCount", { count: held.reduce((total, spool) => total + kept(spool.supports), 0) }),
    t("browser.flangeCount", { count: held.reduce((total, spool) => total + kept(spool.flanges), 0) }),
  ].join(" · ")
  const open = spools.find((spool) => spool.spoolRevisionId === spoolRevisionId) ?? null

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-semibold">{iso.isoNumber}</span>
            {history.length > 1 && shownId ? (
              <Select value={shownId} onValueChange={onRevisionChange}>
                <SelectTrigger size="sm" aria-label={t("browser.chooseRevision")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {history.map((revision) => (
                    <SelectItem key={revision.id} value={revision.id}>
                      <span className="flex items-center gap-2">{revision.revisionNumber} <StatusBadge status={revision.status} /></span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-muted-foreground text-sm font-normal">{t("browser.revision", { number: revisionNumber ?? "—" })}</span>
            )}
            {/* The switcher's own value already carries the status. */}
            {status && status !== "accepted" && history.length <= 1 ? <StatusBadge status={status} /> : null}
          </h2>
          {current && facts.length > 0 ? <p className="text-muted-foreground text-sm">{facts.join(" · ")}</p> : null}
          {current?.comment ? <p className="text-muted-foreground text-sm">{current.comment}</p> : null}
        </div>
      </header>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <>
          <p className="text-sm">{summary}</p>
          <DataTable
            variant="compact"
            columns={columns}
            rows={spools}
            rowId={(spool) => spool.spoolRevisionId}
            state={table}
            onStateChange={setTable}
            onRowClick={onOpenSpool}
            selectedRowId={spoolRevisionId}
            pagination={false}
            emptyTitle={t("browser.noSpools")}
          />
        </>
      )}
      {open ? (
        <SpoolContentsDrawer
          spool={open}
          isoNumber={iso.isoNumber}
          revisionNumber={revisionNumber ?? "—"}
          isCurrent={status === "accepted"}
          onClose={() => onOpenSpool(null)}
        />
      ) : null}
    </section>
  )
}
