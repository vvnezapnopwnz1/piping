"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { errorDetail } from "@/i18n/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
import { canVisit } from "@/components/pipeqc/navigation-model"
import { useWorkContextParam } from "@/components/pipeqc/work-context"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import {
  currentErectionStage,
  listRftShortfall,
  type RftShortfallKind,
} from "../../application/describe-erection-readiness"
import type { CodesTranslator } from "@/i18n/translator"
import { useRftShortfallLabel } from "./rft-shortfall-label"
import { ERECTION_STAGES } from "../../domain/erection-stage"
import {
  loadErectionChartData,
  loadErectionSpoolPage,
  loadErectionSpoolStageFacets,
  type ErectionChartData,
  type ErectionReadiness,
  type ErectionSpoolCursor,
  type ErectionSpoolQuery,
  type ErectionSpoolStageFacet,
} from "../../infrastructure/supabase-erection-repository"
import { useKeysetSpoolPage } from "../use-keyset-spool-page"
import { erectionSpoolQueryFromTableState, type ErectionStageLabelMap } from "./erection-spool-query"
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
  const te = useTranslations("erection")
  const shortfallLabel = useRftShortfallLabel()
  const items = listRftShortfall(row)
  if (!items.length) return <span className="text-muted-foreground text-sm">{te("shared.rftNoEvidence")}</span>
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
                {shortfallLabel(item)}
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            ) : (
              <span className="text-muted-foreground">{shortfallLabel(item)}</span>
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

type ErectionColumnsTranslator = ReturnType<typeof useTranslations<"erection.columns">>

function readinessColumns(t: ErectionColumnsTranslator, tc: CodesTranslator): ReadonlyArray<DataColumn<ErectionReadiness>> {
  return [
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
    header: t("spool"),
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
    header: t("material"),
    numeric: true,
    value: (row) => ratio(row.materialLineChecked, row.materialLineTotal),
    sortable: false,
    cell: (row) => `${row.materialLineChecked}/${row.materialLineTotal}`,
  },
  {
    id: "fieldWelds",
    header: t("fieldWelds"),
    numeric: true,
    value: (row) => ratio(row.fieldWeldComplete, row.fieldWeldTotal),
    sortable: false,
    cell: (row) => `${row.fieldWeldComplete}/${row.fieldWeldTotal}`,
  },
  {
    id: "fieldSupports",
    header: t("fieldSupports"),
    numeric: true,
    value: (row) => ratio(row.fieldSupportRecorded, row.fieldSupportTotal),
    sortable: false,
    cell: (row) => `${row.fieldSupportRecorded}/${row.fieldSupportTotal}`,
  },
  {
    id: "stage",
    header: t("stage"),
    value: (row) => tc(`erectionStage.${currentErectionStage(row)}`),
    filter: "select",
    sortable: false,
    cell: (row) => (
      <StatusBadge
        status={currentErectionStage(row)}
        label={tc(`erectionStage.${currentErectionStage(row)}`)}
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
          {t("ready")}
          {row.rftOn ? <span className="ml-2 font-mono text-xs">{row.rftOn.slice(0, 10)}</span> : null}
        </span>
      ) : (
        // The reason a spool is not ready is the single most useful thing on this row, so it is
        // shown in place — and each reason opens the screen where it is resolved.
        <RftShortfall row={row} />
      ),
  },
  ]
}

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
  description?: string
  /** An extra sentence for routes whose own module is not built yet. */
  note?: string
  showCharts?: boolean
}) {
  const t = useTranslations("erection.readiness")
  const tc = useTranslations("codes")
  const tcol = useTranslations("erection.columns")
  const columns = useMemo(() => readinessColumns(tcol, tc), [tcol, tc])
  const { projectId, canView, refreshToken } = useErectionReadiness()
  // A spool handed over in the address narrows the table to it; the chip in the page head clears it.
  const [spool] = useWorkContextParam("spool")
  const [charts, setCharts] = useState<ErectionChartData | null>(null)
  const [chartsLoadedProjectId, setChartsLoadedProjectId] = useState<string | null>(null)
  // Namespaced so this table's filters survive alongside anything else the route puts in the URL.
  const [tableState, setTableState] = useTableUrlState({ namespace: "rft" })
  const [stageFacets, setStageFacets] = useState<ErectionSpoolStageFacet[] | null>(null)
  const errorTitle = t("fieldSpoolReadinessCouldNot")
  const stageLabels = useMemo<ErectionStageLabelMap>(() => Object.fromEntries([
    [tc("erectionStage.not_started"), null],
    ...ERECTION_STAGES.map((stage) => [tc(`erectionStage.${stage}`), stage]),
  ]), [tc])
  const query = useMemo(
    () => erectionSpoolQueryFromTableState(tableState, stageLabels, spool),
    [tableState, stageLabels, spool],
  )
  const load = useCallback(
    (cursor: ErectionSpoolCursor | null, nextQuery: ErectionSpoolQuery, pageSize: number) =>
      loadErectionSpoolPage(getSupabaseBrowserClient(), projectId ?? "", cursor, nextQuery, pageSize),
    [projectId],
  )
  const page = useKeysetSpoolPage({
    resetKey: `${projectId}:${canView}:${refreshToken}`,
    query,
    pageSize: tableState.pageSize,
    load,
    errorTitle,
  })

  useEffect(() => {
    if (!projectId || !canView) return
    let cancelled = false
    void loadErectionSpoolStageFacets(getSupabaseBrowserClient(), projectId)
      .then((facets) => { if (!cancelled) setStageFacets(facets) })
      .catch((error: unknown) => toast.error(errorTitle, { description: errorDetail(error) }))
    return () => { cancelled = true }
  }, [projectId, canView, refreshToken, errorTitle])

  useEffect(() => {
    if (!showCharts || !projectId || !canView) return
    let cancelled = false
    void loadErectionChartData(getSupabaseBrowserClient(), projectId)
      .then((data) => { if (!cancelled) setCharts(data) })
      .catch((error: unknown) => toast.error(t("theErectionChartsCouldNot"), { description: errorDetail(error) }))
      .finally(() => { if (!cancelled) setChartsLoadedProjectId(projectId) })
    return () => { cancelled = true }
  }, [projectId, canView, showCharts])

  if (!projectId) {
    return (
      <p className="text-muted-foreground text-sm">{t("selectAProjectToSee")}</p>
    )
  }
  if (!canView) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("viewingErectionProgressNeedsThe")}
      </p>
    )
  }

  const readyCount = stageFacets?.find((facet) => facet.stage === "rft")?.count ?? 0
  const overallCount = stageFacets?.reduce((sum, facet) => sum + facet.count, 0) ?? 0
  const changePageSize = (pageSize: number) => setTableState({ ...tableState, pageSize, pageIndex: 0 })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
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
            {t("fieldSpoolReadiness")}
            {stageFacets === null ? null : (
              <span className="text-muted-foreground ml-2 text-sm font-normal tabular-nums">
                {t("readyCount", { ready: readyCount, total: overallCount })}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={page.rows}
            state={tableState}
            onStateChange={setTableState}
            rowId={(row) => row.spoolRevisionId}
            loading={page.loading}
            serverQuery
            multiSort={false}
            hideSelectedFacetCounts
            serverFacets={{
              stage: (stageFacets ?? []).map((facet) => [tc(`erectionStage.${facet.stage ?? "not_started"}`), facet.count]),
            }}
            serverPagination={{
              pageIndex: page.pageIndex,
              pageSize: tableState.pageSize,
              totalCount: page.totalCount,
              overallCount: spool ? undefined : overallCount,
              hasNextPage: page.hasNextPage,
              onPreviousPage: page.goToPreviousPage,
              onNextPage: page.goToNextPage,
              onPageSizeChange: changePageSize,
            }}
            searchPlaceholder={t("searchIsoOrSpool")}
            emptyTitle={
              spool
                ? t("theSelectedSpoolIsNot")
                : t("noAcceptedFieldSpoolIs")
            }
            emptyDescription={
              spool
                ? t("clearTheSelectedSpoolIn")
                : t("fieldSpoolsAppearOnceAn")
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
