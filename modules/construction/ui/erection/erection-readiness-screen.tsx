"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  currentErectionStageLabel,
  describeRftShortfall,
} from "../../application/describe-erection-readiness"
import type { ErectionReadiness } from "../../infrastructure/supabase-erection-repository"
import { useErectionReadiness } from "./use-erection-readiness"

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
    truncate: true,
    className: "max-w-72",
    cell: (row) =>
      row.isRft ? (
        <span>
          Ready
          {row.rftOn ? <span className="ml-2 font-mono text-xs">{row.rftOn.slice(0, 10)}</span> : null}
        </span>
      ) : (
        // The reason a spool is not ready is the single most useful thing on this row, so it is
        // shown in place rather than left for the operator to work out from the counts.
        <span className="text-muted-foreground text-sm">{describeRftShortfall(row)}</span>
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
}: {
  title: string
  description: string
  /** An extra sentence for routes whose own module is not built yet. */
  note?: string
}) {
  const { projectId, isLoading, loadFailed, rows, canView } = useErectionReadiness()
  // Namespaced so this table's filters survive alongside anything else the route puts in the URL.
  const [tableState, setTableState] = useTableUrlState({ namespace: "rft" })

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

      <Card>
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
              emptyTitle="No accepted field spool is available on this project."
              emptyDescription="Field spools appear once an engineering revision is accepted."
            />
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">
        Ready For Test is derived, never stored: it opens once Welded / Bolted and Supported are
        recorded and no NDE obligation or PWHT requirement is left open. The material columns
        count evidence from either phase, because a spool revision carries one material check.
      </p>
    </div>
  )
}
