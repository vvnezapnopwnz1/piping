"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"

import { canVisit } from "@/components/pipeqc/navigation-model"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { StatusBadge } from "@/components/ui/status-badge"
import { useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { errorDetail } from "@/i18n/format"
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client"
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
  loadErectionSpoolPage,
  loadErectionSpoolStageFacets,
  type ErectionReadiness,
  type ErectionSpoolCursor,
  type ErectionSpoolQuery,
  type ErectionSpoolStageFacet,
} from "../../infrastructure/supabase-erection-repository"
import { useKeysetSpoolPage } from "../use-keyset-spool-page"
import { erectionSpoolQueryFromTableState, type ErectionStageLabelMap } from "./erection-spool-query"
import { RecordSelectTable } from "@/components/ui/data-table/record-select-table"

interface FieldSpoolPickerProps {
  projectId: string
  value: string | null
  /** The selected spool, shown in the folded bar even when the current page does not hold it. */
  selected?: ErectionReadiness | null
  onChange: (row: ErectionReadiness) => void
  /** True while the operator is back in the list; see `SpoolSelectTable`. */
  browsing: boolean
  onBrowsingChange: (browsing: boolean) => void
  /** Changes when a milestone is saved, so the list reloads the stage it shows. */
  refreshToken?: number
}

/** Sorts on how far along the work is, so "3/12" and "3/400" do not land next to each other. */
const ratio = (done: number, total: number) => (total === 0 ? 1 : done / total)

const SHORTFALL_HREF: Record<RftShortfallKind, string> = {
  welded_bolted: "/erection/welded-bolted",
  supported: "/erection/supported",
  nde: "/nde",
  pwht: "/fabrication/qc-release",
}

function ReadyForTestCell({ row }: { row: ErectionReadiness }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const can = useOptionalAccess()?.can
  const query = params.toString()
  const here = query ? `${pathname}?${query}` : pathname
  const te = useTranslations("erection")
  const shortfallLabel = useRftShortfallLabel()

  if (row.isRft) {
    return (
      <span>
        {te("shared.ready")}
        {row.rftOn ? <span className="ml-2 font-mono text-xs">{row.rftOn.slice(0, 10)}</span> : null}
      </span>
    )
  }

  const items = listRftShortfall(row)
  if (!items.length) {
    return <span className="text-muted-foreground text-sm">{te("shared.rftNoEvidence")}</span>
  }

  const first = items[0]
  const path = SHORTFALL_HREF[first.kind]

  return can && canVisit(path, can) ? (
    <Link
      href={linkFrom(`${path}?spool=${encodeURIComponent(row.spoolRevisionId)}`, here)}
      data-help="rft-blocker"
      className="inline-flex items-center gap-1 underline decoration-[#bdb19c] underline-offset-2 hover:decoration-current text-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {shortfallLabel(first)}
      <ArrowRight aria-hidden="true" className="size-3.5" />
    </Link>
  ) : (
    <span className="text-muted-foreground text-sm">{shortfallLabel(first)}</span>
  )
}

/**
 * The erection counterpart of `fabrication/spool-picker.tsx`: the table's search, filters and
 * sorting go to the server, and the rows arrive one cursor page at a time.
 *
 * The columns are the field's, not the shop's: `material*` is phase-agnostic by design (one
 * `material_check_records` row per spool revision) while the `field*` counters are phase-filtered,
 * so they are labelled accordingly rather than sharing a heading.
 */
type ErectionColumnsTranslator = ReturnType<typeof useTranslations<"erection.columns">>

function fieldSpoolColumns(t: ErectionColumnsTranslator, tc: CodesTranslator): ReadonlyArray<DataColumn<ErectionReadiness>> {
  return [
  {
    id: "spoolNumber",
    header: t("spool"),
    value: (row) => row.spoolNumber,
    searchable: true,
    filter: "text",
    pinned: true,
    alwaysVisible: true,
    className: "font-mono text-xs",
    cell: (row) => (
      <>
        {row.spoolNumber}
        <span className="text-muted-foreground ml-2">{row.revisionNumber}</span>
      </>
    ),
  },
  {
    id: "isoNumber",
    header: "ISO",
    value: (row) => row.isoNumber,
    searchable: true,
    filter: "text",
    className: "font-mono text-xs",
  },
  {
    id: "stage",
    header: t("stage"),
    value: (row) => tc(`erectionStage.${currentErectionStage(row)}`),
    filter: "select",
    // The stage can be empty, and a null-safe keyset sort would need a cursor shape of its own.
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
  { id: "ndePending", header: t("ndeOpen"), numeric: true, value: (row) => row.ndePending, filter: "number" },
  { id: "pwhtPending", header: t("pwhtOpen"), numeric: true, value: (row) => row.pwhtPending, filter: "number" },
  { id: "toSiteOn", header: t("toSite"), value: (row) => row.toSiteOn, filter: "date", sortable: false },
  {
    id: "isRft",
    header: t("readyForTest"),
    value: (row) => row.isRft,
    filter: "boolean",
    className: "min-w-44",
    cell: (row) => <ReadyForTestCell row={row} />,
  },
  ]
}

export function FieldSpoolPicker({
  projectId,
  value,
  selected = null,
  onChange,
  browsing,
  onBrowsingChange,
  refreshToken = 0,
}: FieldSpoolPickerProps) {
  const te = useTranslations("erection")
  const t = useTranslations("erection.spoolPicker")
  const tShell = useTranslations("erection.shell")
  const tc = useTranslations("codes")
  const tcol = useTranslations("erection.columns")
  const columns = useMemo(() => fieldSpoolColumns(tcol, tc), [tcol, tc])
  const errorTitle = tShell("fieldSpoolsCouldNotBe")
  const [tableState, setTableState] = useTableUrlState({ namespace: "fspool" })
  const [stageFacets, setStageFacets] = useState<ErectionSpoolStageFacet[] | null>(null)
  const stageLabels = useMemo<ErectionStageLabelMap>(() => Object.fromEntries([
    [tc("erectionStage.not_started"), null],
    ...ERECTION_STAGES.map((stage) => [tc(`erectionStage.${stage}`), stage]),
  ]), [tc])
  const query = useMemo(
    () => erectionSpoolQueryFromTableState(tableState, stageLabels),
    [tableState, stageLabels],
  )
  const load = useCallback(
    (cursor: ErectionSpoolCursor | null, nextQuery: ErectionSpoolQuery, pageSize: number) =>
      loadErectionSpoolPage(getSupabaseBrowserClient(), projectId, cursor, nextQuery, pageSize),
    [projectId],
  )
  const page = useKeysetSpoolPage({
    resetKey: `${projectId}:${refreshToken}`,
    query,
    pageSize: tableState.pageSize,
    load,
    errorTitle,
  })

  useEffect(() => {
    let cancelled = false
    void loadErectionSpoolStageFacets(getSupabaseBrowserClient(), projectId)
      .then((facets) => {
        if (!cancelled) setStageFacets(facets)
      })
      .catch((error: unknown) => toast.error(errorTitle, { description: errorDetail(error) }))
    return () => { cancelled = true }
  }, [projectId, refreshToken, errorTitle])

  const changePageSize = (pageSize: number) => setTableState({ ...tableState, pageSize, pageIndex: 0 })
  // The folded bar names the selected spool, which a filter or another page may have pushed out.
  const rows =
    !browsing && selected && selected.spoolRevisionId === value && !page.rows.some((row) => row.spoolRevisionId === value)
      ? [selected, ...page.rows]
      : page.rows

  return (
    <RecordSelectTable
      title={t("fieldSpools")}
      columns={columns}
      rows={rows}
      rowId={(row) => row.spoolRevisionId}
      selectedId={value}
      onSelect={onChange}
      browsing={browsing}
      onBrowsingChange={onBrowsingChange}
      loading={page.loading}
      tableState={tableState}
      onTableStateChange={setTableState}
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
        overallCount: stageFacets?.reduce((sum, facet) => sum + facet.count, 0),
        hasNextPage: page.hasNextPage,
        onPreviousPage: page.goToPreviousPage,
        onNextPage: page.goToNextPage,
        onPageSizeChange: changePageSize,
      }}
      namespace="fspool"
      changeLabel={t("changeSpool")}
      searchPlaceholder={t("searchSpoolIsoOrStage")}
      emptyTitle={t("noAcceptedFieldSpoolIs")}
      emptyDescription={t("fieldSpoolsAppearOnceAn")}
      selectedIdentity={(row) => row.spoolNumber}
      // The separator lives in the text, not in CSS margin, so the accessible name does not
      // concatenate to "ER0ISO-2201-07".
      selectedMeta={(row) => te("shared.revIso", { rev: row.revisionNumber, iso: row.isoNumber })}
    />
  )
}
