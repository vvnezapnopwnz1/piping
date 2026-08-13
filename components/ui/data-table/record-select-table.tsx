"use client"

import type { ReactNode } from "react"
import { Repeat2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IdentityHeadline } from "@/components/ui/record-target"
import { DataTable, type DataColumn } from "./data-table"
import { useTableUrlState } from "./use-table-url-state"

/**
 * "Choose the record everything below is about" — what a spool screen, a field screen and the Test
 * Pack Builder all ask first, and on a real project each is a choice out of hundreds or thousands.
 * Every one of them had grown its own list in a narrow column: a substring filter over a capped
 * scroll box, with no sort, no paging, and nothing to narrow by except the number you already had
 * to know.
 *
 * So the list is a full table across the page instead — and then folds itself away, because once
 * the spool is chosen the operator is working in the form below and the list is just in the way.
 * Selecting collapses it to one line; "Change spool" brings it back with its filters intact,
 * because they live in the URL rather than in this component.
 */
export function RecordSelectTable<Row>({
  title,
  columns,
  rows,
  rowId,
  selectedId,
  onSelect,
  browsing,
  onBrowsingChange,
  selectedIdentity,
  selectedMeta,
  loading = false,
  namespace,
  changeLabel,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  toolbarActions,
}: {
  title: string
  columns: ReadonlyArray<DataColumn<Row>>
  rows: readonly Row[]
  rowId: (row: Row) => string
  selectedId: string | null
  onSelect: (row: Row) => void
  /**
   * True while the operator is back in the list looking for a different spool. Controlled by the
   * screen rather than held here, because everything the screen renders below — the joint list,
   * the record form — is about the spool being replaced and has to go away with it.
   */
  browsing: boolean
  onBrowsingChange: (browsing: boolean) => void
  /** The word on the button that reopens the list — "Change spool", "Change Test Pack". */
  changeLabel: string
  /** The number the operator recognises, shown large while the table is folded away. */
  selectedIdentity: (row: Row) => ReactNode
  /** Revision, parent ISO — whatever disambiguates the identity without competing with it. */
  selectedMeta?: (row: Row) => ReactNode
  loading?: boolean
  namespace: string
  searchPlaceholder: string
  emptyTitle: string
  emptyDescription?: string
  /** Screen-specific actions for the open list — "New Test Pack" and the like. */
  toolbarActions?: ReactNode
}) {
  const [tableState, setTableState] = useTableUrlState({ namespace })

  const selected = selectedId ? (rows.find((row) => rowId(row) === selectedId) ?? null) : null
  // Nothing chosen yet means there is nothing to fold away, so the table opens on its own.
  const open = browsing || selected === null

  if (!open && selected) {
    return (
      // Folded, this bar is the only thing on screen saying which of record everything below is about, so it is set as a headline rather than a caption.
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-3">
          <IdentityHeadline
            kind={title}
            identity={selectedIdentity(selected)}
            meta={selectedMeta?.(selected)}
            action={
              <Button variant="outline" size="sm" onClick={() => onBrowsingChange(true)}>
                <Repeat2 /> {changeLabel}
              </Button>
            }
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          rows={rows}
          state={tableState}
          onStateChange={setTableState}
          rowId={rowId}
          loading={loading}
          selectedRowId={selectedId}
          onRowClick={(row) => {
            onSelect(row)
            // Folding on selection is the whole point of the pattern: the operator asked for this
            // record, so the next thing they want to see is the form, not the hundreds they did
            // not pick.
            onBrowsingChange(false)
          }}
          searchPlaceholder={searchPlaceholder}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          toolbarActions={toolbarActions}
          containerClassName="max-h-[50vh]"
        />
      </CardContent>
    </Card>
  )
}
