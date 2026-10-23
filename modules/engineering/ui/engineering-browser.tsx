"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { withProject } from "@/components/pipeqc/project-url"
import { Button } from "@/components/ui/button"
import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { useSupabaseAuth } from "@/contexts/supabase-auth-context"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"

import { loadIsometrics, type IsometricRow } from "../infrastructure/supabase-engineering-repository"
import { IsometricPane } from "./isometric-pane"

/**
 * Spooling → Browse: the project's isometrics on the left, the chosen one's spools on the right.
 * The choice lives in the address bar (`iso`, `rev`, `spoolRev`), written the way
 * `useWorkContextParam` writes the spool, so `p` and the table parameters survive and Back closes
 * the drawer rather than leaving the screen.
 */
export function EngineeringBrowser({ projectId }: { projectId: string }) {
  const t = useTranslations("spooling")
  const activityCode = useSupabaseAuth().access?.activityCode ?? null
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const iso = params.get("iso")
  const rev = params.get("rev")
  const spoolRev = params.get("spoolRev")
  const [loaded, setLoaded] = useState<{ projectId: string; rows: IsometricRow[] } | null>(null)
  const [picked, setPicked] = useState(0)
  const pane = useRef<HTMLDivElement>(null)
  const [table, setTable] = useTableUrlState({ namespace: "iso" })

  const write = useCallback(
    (next: Record<string, string | null>, push = false) => {
      const query = new URLSearchParams(window.location.search)
      const before = query.toString()
      for (const [key, value] of Object.entries(next)) {
        if (value) query.set(key, value)
        else query.delete(key)
      }
      const search = query.toString()
      if (search === before) return
      const href = search ? `${pathname}?${search}` : pathname
      if (push) router.push(href, { scroll: false })
      else router.replace(href, { scroll: false })
    },
    [pathname, router],
  )

  useEffect(() => {
    let live = true
    void loadIsometrics(getSupabaseBrowserClient(), projectId)
      .then((rows) => { if (live) setLoaded({ projectId, rows }) })
      .catch((e) => {
        if (!live) return
        toast.error(t("browser.isometricsFailed"), { description: errorDetail(e) })
        setLoaded({ projectId, rows: [] })
      })
    return () => { live = false }
  }, [projectId, t])

  // Below `lg` the panes stack, so a picked isometric would land out of sight under the list.
  useEffect(() => {
    if (picked === 0) return
    if (!window.matchMedia("(max-width: 1023px)").matches) return
    pane.current?.scrollIntoView({ block: "start", behavior: "smooth" })
  }, [picked, iso])

  const isos = loaded?.projectId === projectId ? loaded.rows : []
  const loading = loaded?.projectId !== projectId
  const selected = isos.find((row) => row.id === iso) ?? null

  const columns = useMemo<DataColumn<IsometricRow>[]>(
    () => [
      { id: "iso", header: t("browser.column.iso"), value: (row) => row.isoNumber, searchable: true, alwaysVisible: true, className: "font-mono text-xs" },
      {
        id: "revision",
        header: t("browser.column.revision"),
        value: (row) => row.revisionNumber,
        cell: (row) => (
          <span className="flex items-center gap-2">
            <span>{row.revisionNumber ?? "—"}</span>
            {row.revisionStatus && row.revisionStatus !== "accepted" ? <StatusBadge status={row.revisionStatus} /> : null}
          </span>
        ),
      },
      { id: "spools", header: t("browser.column.spools"), value: (row) => row.spoolCount, numeric: true },
      { id: "welds", header: t("browser.column.welds"), value: (row) => row.weldCount, numeric: true },
    ],
    [t],
  )

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(26rem,30rem)_minmax(0,1fr)] lg:items-start">
      <section className="space-y-3 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:self-start">
        <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
          <span>{t("browser.isometrics")}</span>
          <span className="text-muted-foreground text-sm font-normal tabular-nums">{isos.length}</span>
        </h2>
        <DataTable
          variant="compact"
          columns={columns}
          rows={isos}
          rowId={(row) => row.id}
          state={table}
          onStateChange={setTable}
          loading={loading}
          searchPlaceholder={t("browser.search")}
          selectedRowId={iso}
          onRowClick={(row) => {
            setPicked((value) => value + 1)
            write({ iso: row.id, rev: null, spoolRev: null })
          }}
          emptyTitle={t("browser.empty")}
          emptyDescription={t("browser.emptyHint")}
          emptyAction={
            <Button asChild variant="outline" size="sm">
              <Link href={withProject("/spooling/import", activityCode)}>{t("browser.openImport")}</Link>
            </Button>
          }
        />
      </section>
      {/* Below `lg` the pane needs its own screen height, or `scrollIntoView` cannot reach its top. */}
      {/* The phone's app header stays on top, so the scrolled-to pane stops below it. */}
      <div ref={pane} className={selected ? "max-lg:min-h-dvh max-lg:scroll-mt-28" : undefined}>
        {selected ? (
          <IsometricPane
            key={selected.id}
            iso={selected}
            revisionId={rev}
            onRevisionChange={(id) => write({ rev: id === selected.revisionId ? null : id, spoolRev: null })}
            spoolRevisionId={spoolRev}
            onOpenSpool={(spool) => write({ spoolRev: spool?.spoolRevisionId ?? null }, spool !== null)}
          />
        ) : isos.length > 0 || iso ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            {iso && !loading ? t("browser.notFound") : t("browser.pick")}
          </p>
        ) : null}
      </div>
    </div>
  )
}
