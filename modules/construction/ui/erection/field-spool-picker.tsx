"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { canVisit } from "@/components/pipeqc/navigation-model"
import { linkFrom } from "@/components/pipeqc/workspace-model"
import { StatusBadge } from "@/components/ui/status-badge"
import type { DataColumn } from "@/components/ui/data-table"
import { useOptionalAccess } from "@/modules/access/ui/access-context"
import {
  describeRftShortfall,
  erectionStageDisplay,
  listRftShortfall,
  type RftShortfallKind,
} from "../../application/describe-erection-readiness"
import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"
import { RecordSelectTable } from "@/components/ui/data-table/record-select-table"

interface FieldSpoolPickerProps {
  rows: readonly ErectionReadiness[]
  value: string | null
  onChange: (row: ErectionReadiness) => void
  /** True while the operator is back in the list; see `SpoolSelectTable`. */
  browsing: boolean
  onBrowsingChange: (browsing: boolean) => void
  loading?: boolean
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

  if (row.isRft) {
    return (
      <span>
        Ready
        {row.rftOn ? <span className="ml-2 font-mono text-xs">{row.rftOn.slice(0, 10)}</span> : null}
      </span>
    )
  }

  const items = listRftShortfall(row)
  if (!items.length) {
    return <span className="text-muted-foreground text-sm">{describeRftShortfall(row)}</span>
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
      {first.label}
      <ArrowRight aria-hidden="true" className="size-3.5" />
    </Link>
  ) : (
    <span className="text-muted-foreground text-sm">{first.label}</span>
  )
}

/**
 * The erection counterpart of `fabrication/spool-picker.tsx`. It picks from the readiness rows the
 * screen already holds rather than issuing its own read, because every erection screen needs the
 * same rows for its gate as well as for the list.
 *
 * The columns are the field's, not the shop's: `material*` is phase-agnostic by design (one
 * `material_check_records` row per spool revision) while the `field*` counters are phase-filtered,
 * so they are labelled accordingly rather than sharing a heading.
 */
const FIELD_SPOOL_COLUMNS: ReadonlyArray<DataColumn<ErectionReadiness>> = [
  {
    id: "spoolNumber",
    header: "Spool",
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
    header: "Stage",
    value: (row) => erectionStageDisplay(row).label,
    filter: "select",
    cell: (row) => {
      const display = erectionStageDisplay(row)
      return (
        <StatusBadge
          status={display.code}
          label={display.label}
          tone={row.isRft ? "success" : "info"}
        />
      )
    },
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
  { id: "ndePending", header: "NDE open", numeric: true, value: (row) => row.ndePending, filter: "number" },
  { id: "pwhtPending", header: "PWHT open", numeric: true, value: (row) => row.pwhtPending, filter: "number" },
  { id: "toSiteOn", header: "To site", value: (row) => row.toSiteOn, filter: "date" },
  {
    id: "isRft",
    header: "Ready for Test",
    value: (row) => row.isRft,
    filter: "boolean",
    className: "min-w-44",
    cell: (row) => <ReadyForTestCell row={row} />,
  },
]

export function FieldSpoolPicker({
  rows,
  value,
  onChange,
  browsing,
  onBrowsingChange,
  loading = false,
}: FieldSpoolPickerProps) {
  return (
    <RecordSelectTable
      title="Field spools"
      columns={FIELD_SPOOL_COLUMNS}
      rows={rows}
      rowId={(row) => row.spoolRevisionId}
      selectedId={value}
      onSelect={onChange}
      browsing={browsing}
      onBrowsingChange={onBrowsingChange}
      loading={loading}
      namespace="fspool"
      changeLabel="Change spool"
      searchPlaceholder="Search spool, ISO or stage…"
      emptyTitle="No accepted field spool is available on this project."
      emptyDescription="Field spools appear once an engineering revision carrying them is accepted."
      selectedIdentity={(row) => row.spoolNumber}
      // The separator lives in the text, not in CSS margin, so the accessible name does not
      // concatenate to "ER0ISO-2201-07".
      selectedMeta={(row) => `rev ${row.revisionNumber} · ${row.isoNumber}`}
    />
  )
}
