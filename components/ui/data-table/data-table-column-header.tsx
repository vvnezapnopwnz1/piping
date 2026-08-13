'use client'

import * as React from 'react'
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  EyeOff,
  Filter,
  ListFilter,
  Pin,
  PinOff,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ColumnFilterEditor } from './column-filter-editor'
import type { ColumnFilter } from './table-state'

/**
 * The header cell's controls: a click on the title sorts, a menu next to it does everything else.
 *
 * The two mechanisms exist on purpose. Sorting by clicking the heading is what an operator who has
 * used a spreadsheet already knows; the menu is where the operations that have no obvious gesture
 * live. Both are always visible — a control that only appears on hover does not exist on a tablet,
 * which is where half of these screens are read.
 */
export function DataTableColumnHeader({
  label,
  sortDirection,
  sortIndex,
  filterKind,
  filter,
  facets,
  pinned,
  canHide,
  onSort,
  onSortDirection,
  onFilterChange,
  onFilterClear,
  onTogglePinned,
  onHide,
  className,
}: {
  label: string
  sortDirection: 'asc' | 'desc' | null
  /** Position in a multi-column sort, one-based. Hidden when only one column is sorted. */
  sortIndex: number | null
  filterKind?: ColumnFilter['kind']
  filter?: ColumnFilter
  facets?: ReadonlyArray<[string, number]>
  pinned: boolean
  canHide: boolean
  onSort: (event: { shiftKey: boolean }) => void
  /** Sets a direction outright, for the menu, where "sort ascending" must mean exactly that. */
  onSortDirection: (direction: 'asc' | 'desc' | null) => void
  onFilterChange: (filter: ColumnFilter) => void
  onFilterClear: () => void
  onTogglePinned: () => void
  onHide: () => void
  className?: string
}) {
  const [filterOpen, setFilterOpen] = React.useState(false)
  const SortIcon = sortDirection === 'asc' ? ArrowUp : sortDirection === 'desc' ? ArrowDown : ArrowDownUp

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={(event) => onSort({ shiftKey: event.shiftKey })}
        title={`Sort by ${label} — hold Shift to add to the current sort`}
        className="hover:text-foreground focus-visible:ring-ring -mx-1 flex min-w-0 items-center gap-1 rounded px-1 py-0.5 focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="truncate">{label}</span>
        {/* The glyph keeps its place whether or not the column is sorted, so turning sorting on
            does not shove the heading sideways. */}
        <SortIcon
          aria-hidden="true"
          className={cn('size-3 shrink-0', sortDirection ? 'opacity-100' : 'opacity-30')}
        />
        {sortIndex !== null ? (
          <span className="text-muted-foreground text-[10px] tabular-nums">{sortIndex}</span>
        ) : null}
      </button>

      {filterKind ? (
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={filter ? `Edit the ${label} filter` : `Filter by ${label}`}
              className={cn('size-6 shrink-0', filter ? 'text-primary' : 'opacity-40')}
            >
              {filter ? <ListFilter className="size-3.5" /> : <Filter className="size-3.5" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <div className="flex items-center justify-between border-b px-2 py-1.5">
              <span className="text-xs font-medium">{label}</span>
              {filter ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    onFilterClear()
                    setFilterOpen(false)
                  }}
                >
                  <X className="size-3" /> Clear
                </Button>
              ) : null}
            </div>
            <ColumnFilterEditor
              columnId={filter?.id ?? label}
              kind={filterKind}
              label={label}
              value={filter}
              options={facets}
              onChange={onFilterChange}
              onDone={() => setFilterOpen(false)}
            />
          </PopoverContent>
        </Popover>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${label} column options`}
            className="size-6 shrink-0 opacity-40"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ⋮
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => onSortDirection('asc')}>
            <ArrowUp /> Sort ascending
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortDirection('desc')}>
            <ArrowDown /> Sort descending
          </DropdownMenuItem>
          {sortDirection ? (
            <DropdownMenuItem onClick={() => onSortDirection(null)}>
              <X /> Remove sort
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onTogglePinned}>
            {pinned ? <PinOff /> : <Pin />}
            {pinned ? 'Unpin column' : 'Pin to the left'}
          </DropdownMenuItem>
          {canHide ? (
            <DropdownMenuItem onClick={onHide}>
              <EyeOff /> Hide column
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
