"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { useNameWorkContext, useWorkContextParam } from "@/components/pipeqc/work-context"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import {
  currentErectionStageLabel,
  describeRftShortfall,
  listRftShortfall,
  type RftShortfallKind,
} from "../../application/describe-erection-readiness"
import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"
import { loadErectionChartData, type ErectionChartData } from "../../infrastructure/supabase-erection-repository"
import { ErectionChartsPanel } from "./erection-charts-panel"
import { useErectionReadiness } from "./use-erection-readiness"

/** Where each open RFT criterion is recorded. PWHT results are entered on QC Release. */
const SHORTFALL_HREF: Record<RftShortfallKind, string> = {
  welded_bolted: "/erection/welded-bolted",
  supported: "/erection/supported",
  nde: "/nde",
  pwht: "/fabrication/qc-release",
}

/**
 * The reason a spool is not ready, as links: each open criterion opens the screen where it is
 * resolved with this spool already selected, and that screen's Back returns here.
 */
function RftShortfall({ row }: { row: ErectionReadiness }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const can = useOptionalAccess()?.can
  const query = params.toString()
  const here = query ? `${pathname}?${query}` : pathname
  const items = listRftShortfall(row)
  if (!items.length) return <span className="text-muted-foreground text-sm">{describeRftShortfall(row)}</span>
  return (
    <ul className="flex flex-col gap-0.5 whitespace-normal">
      {items.map((item) => {
        const path = SHORTFALL_HREF[item.kind]
        return (
          <li key={item.kind} className="text-sm">
            {can && canVisit(path, can) ? (
              <Link
                href={linkFrom(`${path}?spool=${encodeURIComponent(row.spoolRevisionId)}`, here)}
                data-help="rft-blocker"
                className="inline-flex items-center gap-1 underline decoration-[#bdb19c] underline-offset-2 hover:decoration-current"
              >
                {item.label}
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            ) : (
              <span className="text-muted-foreground">{item.label}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * A count of two numbers is one fact, not two, so the column sorts on how far along the spool is
 * rather than on the text "3/12" — which would put 3/12 next to 3/400.
 */
const ratio = (done: number, total: number) => (total === 0 ? 1 : done / total)

const COLUMNS: ReadonlyArray<DataColumn<ErectionReadiness>> = [
  {
    id: "isoNumber",
    header: "ISO",
    value: (row) => row.isoNumber,
    searchable: true,
    filter: "text",
    pinned: true,
    alwaysVisible: true,
    className: "font-mono text-xs",
  },
  {
    id: "spoolNumber",
    header: "Spool",
    value: (row) => row.spoolNumber,
    searchable: true,
    filter: "text",
    className: "font-mono text-xs",
    cell: (row) => (
      <>
        {row.spoolNumber}
        <span className="text-muted-foreground ml-2">{row.revisionNumber}</span>
      </>
    ),
  },
  {
    id: "material",
    header: "Material",
    numeric: true,
    value: (row) => ratio(row.materialLineChecked, row.materialLineTotal),
    cell: (row) => `${row.materialLineChecked}/${row.materialLineTotal}`,
  },
  {
    id: "fieldWelds",
    header: "Field welds",
    numeric: true,
    value: (row) => ratio(row.fieldWeldComplete, row.fieldWeldTotal),
    cell: (row) => `${row.fieldWeldComplete}/${row.fieldWeldTotal}`,
  },
  {
    id: "fieldSupports",
    header: "Field supports",
    numeric: true,
    value: (row) => ratio(row.fieldSupportRecorded, row.fieldSupportTotal),
    cell: (row) => `${row.fieldSupportRecorded}/${row.fieldSupportTotal}`,
  },
  {
    id: "stage",
    header: "Stage",
    value: (row) => currentErectionStageLabel(row),
    filter: "select",
    cell: (row) => (
      <StatusBadge
        status={currentErectionStageLabel(row)}
        tone={row.isRft ? "success" : "info"}
      />
    ),
  },
  {
    id: "isRft",
    header: "RFT",
    value: (row) => row.isRft,
    filter: "boolean",
    className: "min-w-64",
    cell: (row) =>
      row.isRft ? (
        <span>
          Ready
          {row.rftOn ? <span className="ml-2 font-mono text-xs">{row.rftOn.slice(0, 10)}</span> : null}
        </span>
      ) : (
        // The reason a spool is not ready is the single most useful thing on this row, so it is
        // shown in place — and each reason opens the screen where it is resolved.
        <RftShortfall row={row} />
      ),
  },
]

/**
 * The read-only face of `spool_erection_readiness`, behind the erection dashboard, Ready For
 * Test and Field QC Release. There is no release action on purpose: RFT is a projection of
 * stage, weld, support, NDE and PWHT evidence, and no screen may set it.
 */
export function ErectionReadinessScreen({
  title,
  description,
  note,
  showCharts = false,
}: {
  title: string
  description: string
  /** An extra sentence for routes whose own module is not built yet. */
  note?: string
  showCharts?: boolean
}) {
  const { projectId, isLoading, loadFailed, rows: allRows, canView } = useErectionReadiness()
  // A spool handed over in the address narrows the table to it; the chip in the page head clears it.
  const [spool] = useWorkContextParam("spool")
  const rows = spool ? allRows.filter((row) => row.spoolRevisionId === spool) : allRows
  useNameWorkContext("spool", spool, rows[0]?.spoolNumber)
  const [charts, setCharts] = useState<ErectionChartData | null>(null)
  const [chartsLoadedProjectId, setChartsLoadedProjectId] = useState<string | null>(null)
  // Namespaced so this table's filters survive alongside anything else the route puts in the URL.
  const [tableState, setTableState] = useTableUrlState({ namespace: "rft" })

  useEffect(() => {
    if (!showCharts || !projectId || !canView) return
    let cancelled = false
    void loadErectionChartData(getSupabaseBrowserClient(), projectId)
      .then((data) => { if (!cancelled) setCharts(data) })
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "The erection charts could not be loaded."))
      .finally(() => { if (!cancelled) setChartsLoadedProjectId(projectId) })
    return () => { cancelled = true }
  }, [projectId, canView, showCharts])

  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">Select a project to see erection progress.</p>
    )
  }
  if (!canView) {
    return (
      <p className="text-muted-foreground text-sm">
        Viewing erection progress needs the erection.view capability on this project.
      </p>
    )
  }

  const readyCount = rows.filter((row) => row.isRft).length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        {note ? <p className="text-muted-foreground mt-2 text-sm">{note}</p> : null}
      </div>

      {showCharts ? (
        chartsLoadedProjectId !== projectId
          ? <Skeleton className="h-[38rem] w-full" />
          : <ErectionChartsPanel data={charts} loading={false} />
      ) : null}

      <Card data-help="rft-table">
        <CardHeader>
          <CardTitle>
            Field spool readiness
            {isLoading || loadFailed ? null : (
              <span className="text-muted-foreground ml-2 text-sm font-normal tabular-nums">
                {readyCount}/{rows.length} ready for test
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadFailed ? (
            <p className="text-destructive text-sm">
              Field spool readiness could not be loaded, so nothing is listed. Reload the page,
              and report this if it persists.
            </p>
          ) : (
            <DataTable
              columns={COLUMNS}
              rows={rows}
              state={tableState}
              onStateChange={setTableState}
              rowId={(row) => row.spoolRevisionId}
              loading={isLoading}
              searchPlaceholder="Search ISO or spool…"
              emptyTitle={
                spool
                  ? "The selected spool is not among the field spools you can see."
                  : "No accepted field spool is available on this project."
              }
              emptyDescription={
                spool
                  ? "Clear the selected spool in the page head to list every field spool."
                  : "Field spools appear once an engineering revision is accepted."
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
