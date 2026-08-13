'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Row heights, as one decision rather than per-screen padding. `compact` is for a desk with a
 * mouse and four thousand joints on screen; `comfortable` is the field, where the same table is
 * read and tapped on a tablet and 44px is the smallest target a gloved thumb can hit.
 *
 * The scale lives on the <table> and reaches the cells through descendant selectors, which beat
 * a cell's own padding class. That is deliberate: density has to be settable in one place, or it
 * is not a density control.
 */
const DENSITY = {
  compact: '[&_td]:px-2 [&_td]:py-1 [&_th]:h-8 [&_th]:px-2',
  default: '[&_td]:p-2 [&_th]:h-10 [&_th]:px-2',
  comfortable: '[&_td]:px-3 [&_td]:py-3 [&_th]:h-12 [&_th]:px-3',
} as const

export type TableDensity = keyof typeof DENSITY

function Table({
  className,
  containerClassName,
  density = 'default',
  stickyHeader = false,
  ...props
}: React.ComponentProps<'table'> & {
  /** Applied to the scroll container, which is what a caller usually wants to bound in height. */
  containerClassName?: string
  density?: TableDensity
  /**
   * Pins the header while the body scrolls. Only does anything when the container is bounded —
   * pass a height through `containerClassName`, otherwise the page scrolls and there is nothing
   * for the header to stay behind.
   */
  stickyHeader?: boolean
}) {
  return (
    <div
      data-slot="table-container"
      data-sticky-header={stickyHeader ? '' : undefined}
      className={cn('relative w-full overflow-auto', containerClassName)}
    >
      <table
        data-slot="table"
        data-density={density}
        className={cn(
          // `border-separate` rather than the browser default: a collapsed table hands its
          // borders to the table itself, and a sticky cell then scrolls out from under its own
          // border. Separated borders belong to the cell, so they travel with it.
          'w-full caption-bottom border-separate border-spacing-0 text-sm',
          DENSITY[density],
          stickyHeader &&
            '[&_thead_th]:bg-background [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-20',
          className,
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_th]:border-b', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child_td]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'bg-muted/50 [&_td]:border-t font-medium [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  )
}

function TableRow({
  className,
  interactive,
  onClick,
  onKeyDown,
  ...props
}: React.ComponentProps<'tr'> & {
  /**
   * Set on a row that opens an editor or selects a record. A bare <tr> offers the keyboard no
   * way in and, because every row already tints on hover, no way to tell it apart by eye.
   */
  interactive?: boolean
}) {
  const activateOnKey = (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      // Dispatching the real click keeps one code path for both input methods, rather than
      // casting a keyboard event into the row's onClick signature.
      event.preventDefault()
      event.currentTarget.click()
    }
    onKeyDown?.(event)
  }

  return (
    <tr
      data-slot="table-row"
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? activateOnKey : onKeyDown}
      className={cn(
        // An opaque row is what makes a pinned cell work: the pinned cell inherits this colour,
        // so the columns sliding underneath it stay hidden, and it still picks up the hover and
        // selected tints because `inherit` resolves against the row's computed value.
        'bg-background [&_td]:border-b transition-colors',
        // Selection drives the form below, so it has to beat hover rather than resemble it: a
        // stronger tint, the weight of the text, and a bar down the leading edge that survives
        // being scrolled past sideways.
        'data-[state=selected]:bg-primary/10 data-[state=selected]:font-medium',
        'data-[state=selected]:[&>td:first-child]:shadow-[inset_3px_0_0_var(--primary)]',
        // The muted tint sits on every row, so it cannot also carry the meaning "clickable".
        // An interactive row takes a stronger, distinct one plus a visible focus ring.
        interactive
          ? 'hover:bg-accent focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none'
          : 'hover:bg-muted/50',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Shared by <th> and <td>, because a column's alignment is a property of the column and reading a
 * right-aligned number under a left-aligned heading is worse than either alone.
 */
type CellShape = {
  /**
   * Numbers, counts, percentages and dates. Right-aligns so digits line up by place value, and
   * switches on tabular figures so a column of counts stops shivering from row to row.
   */
  numeric?: boolean
  /**
   * Free text that has no business setting the column's width — descriptions, remarks, reasons.
   * Cells stay on one line by default so every row is the same height; this clips the overflow
   * instead of letting one long remark push the table off screen. Pair with a `max-w-*` class.
   */
  truncate?: boolean
  /**
   * Pins the column against the left edge while the rest scrolls sideways. Belongs on the column
   * that says which record the row is — the ISO, the spool, the weld number — because without it
   * a wide table shows the operator eight columns of numbers and nothing to attach them to.
   */
  pinned?: boolean
}

const cellShape = ({ numeric, truncate, pinned }: CellShape, isHeader: boolean) =>
  cn(
    'align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
    numeric ? 'text-right tabular-nums' : 'text-left',
    truncate && 'overflow-hidden text-ellipsis',
    pinned &&
      cn(
        'bg-inherit border-border sticky left-0 border-r',
        // Above the body's own cells, but over the header too, so a pinned header cell stays on
        // top when the table scrolls in two directions at once.
        isHeader ? 'z-30' : 'z-10',
      ),
  )

function TableHead({
  className,
  numeric,
  truncate,
  pinned,
  ...props
}: React.ComponentProps<'th'> & CellShape) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'text-foreground font-medium',
        cellShape({ numeric, truncate, pinned }, true),
        className,
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  numeric,
  truncate,
  pinned,
  ...props
}: React.ComponentProps<'td'> & CellShape) {
  return (
    <td
      data-slot="table-cell"
      className={cn(cellShape({ numeric, truncate, pinned }, false), className)}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
