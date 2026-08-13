'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, FilterX, Inbox } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTableToolbar } from './data-table-toolbar'
import { matchesFilter, matchesSearch } from './filter-predicate'
import {
  PAGE_SIZES,
  ariaSort,
  findFilter,
  removeFilter,
  setFilter,
  sortDirection,
  toggleSort,
  type ColumnFilter,
  type DataTableState,
} from './table-state'

/**
 * One column of a worklist. Deliberately not TanStack's `ColumnDef`: everything these screens need
 * is `id`, a header word, and how to get the value out of the row, and keeping the surface that
 * small is what lets sixteen screens be described in a few lines each instead of a config file.
 */
export type DataColumn<Row> = {
  id: string
  header: string
  /** The value used for sorting, filtering, searching and faceting. */
  value: (row: Row) => unknown
  /** What is drawn. Defaults to the value. Use for badges, links, monospace identifiers. */
  cell?: (row: Row) => React.ReactNode
  numeric?: boolean
  pinned?: boolean
  truncate?: boolean
  searchable?: boolean
  filter?: ColumnFilter['kind']
  sortable?: boolean
  /** Excluded from the column-visibility menu. Use for the column that identifies the row. */
  alwaysVisible?: boolean
  className?: string
  headerClassName?: string
}

const compareValues = (a: unknown, b: unknown): number => {
  // Blanks sort last in both directions. A column of dates whose empty rows float to the top puts
  // the rows with no information where the operator looks first, which is exactly backwards.
  const aEmpty = a === null || a === undefined || a === ''
  const bEmpty = b === null || b === undefined || b === ''
  if (aEmpty || bEmpty) return aEmpty && bEmpty ? 0 : aEmpty ? 1 : -1

  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)

  const aText = String(a)
  const bText = String(b)
  // `numeric` makes SP-2 come before SP-10, which is the order a spool list is expected in.
  return aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' })
}

export function DataTable<Row>({
  columns,
  rows,
  state,
  onStateChange,
  rowId,
  onRowClick,
  selectedRowId,
  loading = false,
  searchPlaceholder,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  toolbarActions,
  containerClassName,
  className,
}: {
  columns: ReadonlyArray<DataColumn<Row>>
  rows: readonly Row[]
  state: DataTableState
  onStateChange: (next: DataTableState) => void
  rowId: (row: Row) => string
  onRowClick?: (row: Row) => void
  selectedRowId?: string | null
  loading?: boolean
  searchPlaceholder?: string
  emptyTitle?: string
  emptyDescription?: string
  toolbarActions?: React.ReactNode
  containerClassName?: string
  className?: string
}) {
  const visibleColumns = React.useMemo(
    () => columns.filter((column) => !state.hidden.includes(column.id)),
    [columns, state.hidden],
  )

  const searchable = React.useMemo(
    () => columns.filter((column) => column.searchable),
    [columns],
  )

  // Filtering happens before sorting and sorting before paging, which is the only order that lets
  // page 1 mean "the first page of what is currently selected".
  const filtered = React.useMemo(() => {
    if (state.filters.length === 0 && state.search.trim() === '') return rows

    const byId = new Map(columns.map((column) => [column.id, column]))
    return rows.filter((row) => {
      for (const filter of state.filters) {
        const column = byId.get(filter.id)
        if (column && !matchesFilter(column.value(row), filter)) return false
      }
      return matchesSearch(
        searchable.map((column) => column.value(row)),
        state.search,
      )
    })
  }, [rows, columns, searchable, state.filters, state.search])

  const sorted = React.useMemo(() => {
    if (state.sorting.length === 0) return filtered
    const byId = new Map(columns.map((column) => [column.id, column]))

    return [...filtered].sort((rowA, rowB) => {
      for (const sort of state.sorting) {
        const column = byId.get(sort.id)
        if (!column) continue
        const result = compareValues(column.value(rowA), column.value(rowB))
        if (result !== 0) return sort.desc ? -result : result
      }
      return 0
    })
  }, [filtered, columns, state.sorting])

  const pageCount = Math.max(1, Math.ceil(sorted.length / state.pageSize))
  // A filter that shrinks the result below the current page would otherwise show an empty page and
  // read as "no results".
  const pageIndex = Math.min(state.pageIndex, pageCount - 1)
  const paged = React.useMemo(
    () => sorted.slice(pageIndex * state.pageSize, (pageIndex + 1) * state.pageSize),
    [sorted, pageIndex, state.pageSize],
  )

  /** Facet counts come from the rows the *other* filters left, so a facet never offers a dead end. */
  const facetsFor = React.useCallback(
    (columnId: string): Array<[string, number]> => {
      const column = columns.find((item) => item.id === columnId)
      if (!column) return []
      const others = state.filters.filter((filter) => filter.id !== columnId)
      const byId = new Map(columns.map((item) => [item.id, item]))

      const counts = new Map<string, number>()
      for (const row of rows) {
        const keep = others.every((filter) => {
          const other = byId.get(filter.id)
          return !other || matchesFilter(other.value(row), filter)
        })
        if (!keep) continue

        const raw = column.value(row)
        const values = Array.isArray(raw) ? raw : [raw]
        for (const value of values) {
          const key = value === null || value === undefined ? '' : String(value)
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
      }
      return [...counts.entries()]
    },
    [columns, rows, state.filters],
  )

  const patch = (next: Partial<DataTableState>) => onStateChange({ ...state, ...next })

  /**
   * A screen pins its identity column by default; the operator can pin another or unpin that one.
   * Both live here rather than on the column object, because a column definition is a module-level
   * constant shared by every mount of the screen — writing to it would leak one operator's layout
   * into the next render and never trigger one.
   */
  const isPinned = (column: DataColumn<Row>) =>
    state.pinned.includes(column.id) || (column.pinned === true && !state.hidden.includes(column.id))

  const filteringActive = state.filters.length > 0 || state.search.trim() !== ''

  return (
    <div className={cn('space-y-3', className)}>
      <DataTableToolbar
        state={state}
        onChange={onStateChange}
        columnLabels={Object.fromEntries(columns.map((column) => [column.id, column.header]))}
        hideableColumns={columns
          .filter((column) => !column.alwaysVisible)
          .map((column) => ({ id: column.id, label: column.header }))}
        searchPlaceholder={searchPlaceholder ?? `Search ${searchable.map((c) => c.header.toLowerCase()).join(', ')}…`}
        rowCount={sorted.length}
        totalCount={rows.length}
      >
        {toolbarActions}
      </DataTableToolbar>

      <div className="rounded-md border">
        <Table
          stickyHeader
          density={state.density}
          containerClassName={cn('max-h-[65vh]', containerClassName)}
        >
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableHead
                  key={column.id}
                  numeric={column.numeric}
                  pinned={isPinned(column)}
                  aria-sort={column.sortable === false ? undefined : ariaSort(state.sorting, column.id)}
                  className={column.headerClassName}
                >
                  {column.sortable === false ? (
                    column.header
                  ) : (
                    <DataTableColumnHeader
                      label={column.header}
                      sortDirection={sortDirection(state.sorting, column.id)}
                      sortIndex={
                        state.sorting.length > 1
                          ? (state.sorting.findIndex((sort) => sort.id === column.id) + 1 || null)
                          : null
                      }
                      filterKind={column.filter}
                      filter={findFilter(state.filters, column.id)}
                      facets={column.filter === 'select' ? facetsFor(column.id) : undefined}
                      pinned={isPinned(column)}
                      canHide={!column.alwaysVisible}
                      className={column.numeric ? 'justify-end' : undefined}
                      onSort={({ shiftKey }) =>
                        patch({ sorting: toggleSort(state.sorting, column.id, { additive: shiftKey }) })
                      }
                      onSortDirection={(direction) =>
                        patch({
                          sorting:
                            direction === null
                              ? state.sorting.filter((sort) => sort.id !== column.id)
                              : [
                                  ...state.sorting.filter((sort) => sort.id !== column.id),
                                  { id: column.id, desc: direction === 'desc' },
                                ],
                        })
                      }
                      onFilterChange={(filter) =>
                        patch({ filters: setFilter(state.filters, filter), pageIndex: 0 })
                      }
                      onFilterClear={() =>
                        patch({ filters: removeFilter(state.filters, column.id), pageIndex: 0 })
                      }
                      onTogglePinned={() =>
                        patch({
                          pinned: isPinned(column)
                            ? state.pinned.filter((id) => id !== column.id)
                            : [...state.pinned, column.id],
                        })
                      }
                      onHide={() => patch({ hidden: [...state.hidden, column.id] })}
                    />
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              // A skeleton shaped like the table it replaces. A lone grey rectangle tells the
              // operator that something is loading but not that it is this list.
              Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {visibleColumns.map((column) => (
                    <TableCell key={column.id} pinned={isPinned(column)}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="h-40 text-center">
                  <div className="text-muted-foreground flex flex-col items-center gap-2">
                    {filteringActive ? (
                      <>
                        <FilterX className="size-6" />
                        <p className="text-sm">No rows match the current filters.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => patch({ search: '', filters: [], pageIndex: 0 })}
                        >
                          Clear filters
                        </Button>
                      </>
                    ) : (
                      <>
                        <Inbox className="size-6" />
                        <p className="text-sm">{emptyTitle}</p>
                        {emptyDescription ? <p className="text-xs">{emptyDescription}</p> : null}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row) => {
                const id = rowId(row)
                return (
                  <TableRow
                    key={id}
                    interactive={Boolean(onRowClick)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    data-state={selectedRowId === id ? 'selected' : undefined}
                    // The tint says "this one" to the eye and nothing at all to a screen reader,
                    // which is the whole gap `aria-current` exists to close on a list whose
                    // selection drives the form beside it.
                    aria-current={selectedRowId === id ? 'true' : undefined}
                  >
                    {visibleColumns.map((column) => (
                      <TableCell
                        key={column.id}
                        numeric={column.numeric}
                        pinned={isPinned(column)}
                        truncate={column.truncate}
                        className={column.className}
                      >
                        {column.cell ? column.cell(row) : formatValue(column.value(row))}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="tabular-nums">
          {sorted.length === 0
            ? 'No rows'
            : `${pageIndex * state.pageSize + 1}–${Math.min((pageIndex + 1) * state.pageSize, sorted.length)} of ${sorted.length}`}
          {filteringActive && rows.length !== sorted.length ? ` (filtered from ${rows.length})` : ''}
        </span>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1">
            <span className="sr-only sm:not-sr-only">Rows per page</span>
            <select
              value={state.pageSize}
              onChange={(event) => patch({ pageSize: Number(event.target.value), pageIndex: 0 })}
              aria-label="Rows per page"
              className="border-input bg-background h-8 rounded-md border px-2 text-sm"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={pageIndex === 0}
            onClick={() => patch({ pageIndex: pageIndex - 1 })}
          >
            <ChevronLeft />
          </Button>
          <span className="tabular-nums">
            Page {pageIndex + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => patch({ pageIndex: pageIndex + 1 })}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

const formatValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  return String(value)
}
