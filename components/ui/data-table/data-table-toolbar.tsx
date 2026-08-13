'use client'

import * as React from 'react'
import { Columns3, Rows3, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { TableDensity } from '@/components/ui/table'
import { describeFilter } from './filter-predicate'
import type { ColumnFilter, DataTableState } from './table-state'

const DENSITY_LABELS: Record<TableDensity, string> = {
  compact: 'Compact',
  default: 'Default',
  comfortable: 'Comfortable',
}

/**
 * Everything above the table: the one search box, the chips for what is currently applied, and the
 * two view controls.
 *
 * The chips are the point. A filter set from a column header is invisible from anywhere except
 * that header, and with a dozen columns nobody scans twelve headings to work out why a joint they
 * expected is missing. Every applied filter shows up here, named, and comes off in one click.
 */
export function DataTableToolbar({
  state,
  onChange,
  columnLabels,
  hideableColumns,
  searchPlaceholder = 'Search…',
  rowCount,
  totalCount,
  children,
}: {
  state: DataTableState
  onChange: (next: DataTableState) => void
  columnLabels: Record<string, string>
  hideableColumns: ReadonlyArray<{ id: string; label: string }>
  searchPlaceholder?: string
  rowCount: number
  totalCount: number
  /** Screen-specific actions — export, create, refresh — sit on the right of the search row. */
  children?: React.ReactNode
}) {
  // The box is typed into letter by letter; the state it feeds is in the URL. Debouncing keeps a
  // ten-character search from writing ten history entries and re-filtering ten times.
  const [draft, setDraft] = React.useState(state.search)
  React.useEffect(() => setDraft(state.search), [state.search])
  React.useEffect(() => {
    if (draft === state.search) return
    const timer = setTimeout(() => onChange({ ...state, search: draft, pageIndex: 0 }), 250)
    return () => clearTimeout(timer)
  }, [draft])

  const clearFilter = (id: string) =>
    onChange({ ...state, filters: state.filters.filter((filter) => filter.id !== id), pageIndex: 0 })

  const clearAll = () => onChange({ ...state, search: '', filters: [], pageIndex: 0 })

  const hasAny = state.filters.length > 0 || state.search.trim() !== ''

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 pl-8"
          />
          {draft ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Clear the search"
              onClick={() => setDraft('')}
              className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>

        {children}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Rows3 /> {DENSITY_LABELS[state.density]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Row height</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={state.density}
              onValueChange={(value) => onChange({ ...state, density: value as TableDensity })}
            >
              {(Object.keys(DENSITY_LABELS) as TableDensity[]).map((density) => (
                <DropdownMenuRadioItem key={density} value={density}>
                  {DENSITY_LABELS[density]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {hideableColumns.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Columns3 /> Columns
                {state.hidden.length > 0 ? (
                  <span className="text-muted-foreground tabular-nums">
                    ({hideableColumns.length - state.hidden.length}/{hideableColumns.length})
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hideableColumns.map((column) => {
                const visible = !state.hidden.includes(column.id)
                return (
                  <label
                    key={column.id}
                    className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                  >
                    <Checkbox
                      checked={visible}
                      onCheckedChange={() =>
                        onChange({
                          ...state,
                          hidden: visible
                            ? [...state.hidden, column.id]
                            : state.hidden.filter((id) => id !== column.id),
                        })
                      }
                    />
                    <span className="truncate">{column.label}</span>
                  </label>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {hasAny ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Filters:</span>
          {state.search.trim() ? (
            <FilterChip
              label={`Search: ${state.search}`}
              onRemove={() => onChange({ ...state, search: '', pageIndex: 0 })}
            />
          ) : null}
          {state.filters.map((filter: ColumnFilter) => (
            <FilterChip
              key={filter.id}
              label={describeFilter(filter, columnLabels[filter.id] ?? filter.id)}
              onRemove={() => clearFilter(filter.id)}
            />
          ))}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearAll}>
            Clear all
          </Button>
          <span className="text-muted-foreground ml-auto text-xs tabular-nums">
            {rowCount} of {totalCount} rows
          </span>
        </div>
      ) : null}
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="bg-secondary text-secondary-foreground inline-flex max-w-64 items-center gap-1 rounded-md px-2 py-0.5 text-xs">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="hover:text-foreground focus-visible:ring-ring -mr-0.5 rounded focus-visible:ring-2 focus-visible:outline-none"
      >
        <X className="size-3" />
      </button>
    </span>
  )
}
