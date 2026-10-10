// modules/project-setup/ui/reference-pane.tsx
"use client"

import type { ReactNode } from "react"

import { DataTable, useTableUrlState, type DataColumn } from "@/components/ui/data-table"

/** One reference on the right of the list: its name, how many rows, what can be done, the table. */
export function ReferencePane({
  title,
  description,
  count,
  status,
  actions,
  children,
}: {
  title: string
  description?: string
  count?: number
  status?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            <span>{title}</span>
            {count !== undefined ? (
              <span className="text-muted-foreground text-sm font-normal tabular-nums">{count}</span>
            ) : null}
            {status}
          </h2>
          {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}

/**
 * A reference table on the shared worklist table: search once there are more than ten rows, sort by
 * any column, fifty rows a page. Render it with `key={reference}` so moving to another reference
 * starts from a clean search.
 */
export function ReferenceTable<Row>({
  columns,
  rows,
  rowId,
  emptyTitle,
  searchPlaceholder,
}: {
  columns: ReadonlyArray<DataColumn<Row>>
  rows: readonly Row[]
  rowId: (row: Row) => string
  emptyTitle: string
  searchPlaceholder?: string
}) {
  const [state, setState] = useTableUrlState()
  return (
    <DataTable
      variant="compact"
      columns={columns}
      rows={rows}
      rowId={rowId}
      state={state}
      onStateChange={setState}
      emptyTitle={emptyTitle}
      searchPlaceholder={searchPlaceholder}
    />
  )
}
