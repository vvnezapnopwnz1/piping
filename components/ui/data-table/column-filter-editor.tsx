'use client'

import { useTranslations } from 'next-intl'
import * as React from 'react'
import { Check, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { ColumnFilter } from './table-state'

/**
 * The body of the header's funnel. One editor per filter kind, all producing the same
 * `ColumnFilter` shape, so the toolbar's chips and the predicate never have to know which control
 * the operator used.
 */
export function ColumnFilterEditor({
  columnId,
  kind,
  label,
  value,
  options,
  hideSelectedOptionCounts = false,
  onChange,
  onDone,
}: {
  columnId: string
  kind: NonNullable<ColumnFilter['kind']>
  label: string
  value: ColumnFilter | undefined
  /** Distinct values present in the column, with how many rows carry each. */
  options?: ReadonlyArray<[string, number]>
  /** A selected option is already marked with a checkbox; some screens do not need its count too. */
  hideSelectedOptionCounts?: boolean
  onChange: (filter: ColumnFilter) => void
  onDone: () => void
}) {
  switch (kind) {
    case 'select':
      return (
        <SelectFilter
          columnId={columnId}
          value={value?.kind === 'select' ? value.values : []}
          options={options ?? []}
          hideSelectedOptionCounts={hideSelectedOptionCounts}
          onChange={(values) => onChange({ id: columnId, kind: 'select', values })}
        />
      )
    case 'number':
      return (
        <RangeFilter
          label={label}
          type="number"
          from={value?.kind === 'number' ? (value.min?.toString() ?? '') : ''}
          to={value?.kind === 'number' ? (value.max?.toString() ?? '') : ''}
          onChange={(from, to) =>
            onChange({
              id: columnId,
              kind: 'number',
              min: from === '' ? null : Number(from),
              max: to === '' ? null : Number(to),
            })
          }
          onDone={onDone}
        />
      )
    case 'date':
      return (
        <RangeFilter
          label={label}
          type="date"
          from={value?.kind === 'date' ? (value.from ?? '') : ''}
          to={value?.kind === 'date' ? (value.to ?? '') : ''}
          onChange={(from, to) =>
            onChange({ id: columnId, kind: 'date', from: from || null, to: to || null })
          }
          onDone={onDone}
        />
      )
    case 'boolean':
      return (
        <BooleanFilter
          value={value?.kind === 'boolean' ? value.value : null}
          onChange={(next) => {
            onChange({ id: columnId, kind: 'boolean', value: next })
            onDone()
          }}
        />
      )
    case 'text':
    default:
      return (
        <TextFilter
          label={label}
          value={value?.kind === 'text' ? value.value : ''}
          onChange={(next) => onChange({ id: columnId, kind: 'text', value: next })}
          onDone={onDone}
        />
      )
  }
}

function TextFilter({
  label,
  value,
  onChange,
  onDone,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onDone: () => void
}) {
  const tt = useTranslations('common.table')
  return (
    <div className="space-y-2 p-2">
      <Label htmlFor="column-filter-text" className="text-xs">
        {label} contains
      </Label>
      <Input
        id="column-filter-text"
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && onDone()}
        placeholder={tt('typeToFilter')}
        className="h-8"
      />
    </div>
  )
}

function SelectFilter({
  columnId,
  value,
  options,
  hideSelectedOptionCounts,
  onChange,
}: {
  columnId: string
  value: string[]
  options: ReadonlyArray<[string, number]>
  hideSelectedOptionCounts: boolean
  onChange: (values: string[]) => void
}) {
  const tt = useTranslations('common.table')
  const [query, setQuery] = React.useState('')

  // A welder list runs to hundreds of names; without a search inside the facet the operator is
  // scrolling a popover to find one.
  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? options.filter(([option]) => option.toLowerCase().includes(needle)) : options
  }, [options, query])

  const toggle = (option: string) =>
    onChange(
      value.includes(option) ? value.filter((item) => item !== option) : [...value, option],
    )

  return (
    <div className="space-y-2 p-2">
      {options.length > 8 ? (
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-2 left-2 size-4" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tt('searchValues')}
            className="h-8 pl-8"
            aria-label={tt('searchValuesLabel')}
          />
        </div>
      ) : null}

      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1.5 text-sm">{tt('noValues')}</p>
        ) : (
          visible.map(([option, count]) => (
            <label
              key={`${columnId}-${option}`}
              className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            >
              <Checkbox checked={value.includes(option)} onCheckedChange={() => toggle(option)} />
              <span className="flex-1 truncate">{option || '—'}</span>
              {!hideSelectedOptionCounts || !value.includes(option) ? (
                <span className="text-muted-foreground tabular-nums">{count}</span>
              ) : null}
            </label>
          ))
        )}
      </div>

      {value.length > 0 ? (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
          {tt('clearSelected', { count: value.length })}
        </Button>
      ) : null}
    </div>
  )
}

function RangeFilter({
  label,
  type,
  from,
  to,
  onChange,
  onDone,
}: {
  label: string
  type: 'number' | 'date'
  from: string
  to: string
  onChange: (from: string, to: string) => void
  onDone: () => void
}) {
  const tt = useTranslations('common.table')
  return (
    <div className="space-y-2 p-2">
      <p className="text-muted-foreground text-xs">{tt('between', { column: label })}</p>
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          type={type}
          value={from}
          aria-label={tt('fromLabel', { column: label })}
          onChange={(event) => onChange(event.target.value, to)}
          onKeyDown={(event) => event.key === 'Enter' && onDone()}
          className="h-8"
          placeholder={tt('fromPlaceholder')}
        />
        <span className="text-muted-foreground text-xs">–</span>
        <Input
          type={type}
          value={to}
          aria-label={tt('toLabel', { column: label })}
          onChange={(event) => onChange(from, event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onDone()}
          className="h-8"
          placeholder={tt('toPlaceholder')}
        />
      </div>
      {/* Either end on its own is a valid filter, so neither is required. */}
      <p className="text-muted-foreground text-xs">{tt('openEnd')}</p>
    </div>
  )
}

function BooleanFilter({
  value,
  onChange,
}: {
  value: boolean | null
  onChange: (value: boolean) => void
}) {
  const tt = useTranslations('common.table')
  return (
    <div className="p-1">
      {[true, false].map((option) => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm',
          )}
        >
          <Check className={cn('size-4', value === option ? 'opacity-100' : 'opacity-0')} />
          {option ? tt('yes') : tt('no')}
        </button>
      ))}
    </div>
  )
}
