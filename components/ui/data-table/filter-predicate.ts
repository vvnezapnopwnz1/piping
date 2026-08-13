import type { ColumnFilter } from './table-state'

/** Everything a row can hold ends up compared as text, a number or a date, so it is folded first. */
const asText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(asText).join(' ')
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value)
}

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(asText(value))
  return Number.isFinite(parsed) && asText(value).trim() !== '' ? parsed : null
}

/** Dates arrive as ISO strings or timestamps; both compare correctly once cut to `YYYY-MM-DD`. */
const asDay = (value: unknown): string | null => {
  const text = asText(value)
  if (text === '') return null
  const day = text.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
}

const asBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  const text = asText(value).toLowerCase()
  return text === 'true' || text === '1' || text === 'yes'
}

/**
 * One predicate for all five filter kinds, so client mode and the chip labels cannot drift apart
 * from each other. An empty filter matches everything rather than nothing — a half-typed range
 * should not blank the table out from under the operator.
 */
export function matchesFilter(cellValue: unknown, filter: ColumnFilter): boolean {
  switch (filter.kind) {
    case 'text': {
      const needle = filter.value.trim().toLowerCase()
      return needle === '' || asText(cellValue).toLowerCase().includes(needle)
    }
    case 'select': {
      if (filter.values.length === 0) return true
      // A cell holding several values (welders on a joint) matches if any of them was picked.
      const candidates = Array.isArray(cellValue) ? cellValue.map(asText) : [asText(cellValue)]
      return candidates.some((candidate) => filter.values.includes(candidate))
    }
    case 'number': {
      const value = asNumber(cellValue)
      if (value === null) return filter.min === null && filter.max === null
      if (filter.min !== null && value < filter.min) return false
      if (filter.max !== null && value > filter.max) return false
      return true
    }
    case 'date': {
      const day = asDay(cellValue)
      if (day === null) return filter.from === null && filter.to === null
      if (filter.from && day < filter.from) return false
      if (filter.to && day > filter.to) return false
      return true
    }
    case 'boolean':
      return asBoolean(cellValue) === filter.value
  }
}

/**
 * The toolbar's single search box. It looks only at the columns a screen marked searchable —
 * running it across every column would match a status word inside a description and leave the
 * operator wondering why an unrelated row came back.
 */
export function matchesSearch(
  values: readonly unknown[],
  search: string,
): boolean {
  const needle = search.trim().toLowerCase()
  if (needle === '') return true
  return values.some((value) => asText(value).toLowerCase().includes(needle))
}

/** Chip text. Says the column, the operator, and the value, in that order and short enough to fit. */
export function describeFilter(filter: ColumnFilter, columnLabel: string): string {
  switch (filter.kind) {
    case 'text':
      return `${columnLabel}: ${filter.value}`
    case 'select':
      return filter.values.length <= 2
        ? `${columnLabel}: ${filter.values.join(', ')}`
        : `${columnLabel}: ${filter.values.length} selected`
    case 'number':
      if (filter.min !== null && filter.max !== null) return `${columnLabel}: ${filter.min}–${filter.max}`
      if (filter.min !== null) return `${columnLabel} ≥ ${filter.min}`
      return `${columnLabel} ≤ ${filter.max}`
    case 'date':
      if (filter.from && filter.to) return `${columnLabel}: ${filter.from} → ${filter.to}`
      if (filter.from) return `${columnLabel} from ${filter.from}`
      return `${columnLabel} until ${filter.to}`
    case 'boolean':
      return `${columnLabel}: ${filter.value ? 'Yes' : 'No'}`
  }
}

export { asText as filterableText }
