import type { TableDensity } from '@/components/ui/table'

/**
 * The four shapes a column filter can take. They are kept as structured values rather than opaque
 * strings so the same object can drive the popover that edits it, the chip that shows it, the
 * predicate that applies it, and — in server mode — the Supabase clause it becomes.
 */
export type ColumnFilter =
  | { id: string; kind: 'text'; value: string }
  | { id: string; kind: 'select'; values: string[] }
  | { id: string; kind: 'number'; min: number | null; max: number | null }
  | { id: string; kind: 'date'; from: string | null; to: string | null }
  | { id: string; kind: 'boolean'; value: boolean }

export type ColumnSort = { id: string; desc: boolean }

/**
 * Everything about a table that an operator can change and would expect to survive a reload, a
 * back button, or being pasted into a chat message. That is exactly why it is one serialisable
 * object and not nine `useState` calls: the URL can only carry what has a single home.
 */
export type DataTableState = {
  search: string
  sorting: ColumnSort[]
  filters: ColumnFilter[]
  pageIndex: number
  pageSize: number
  density: TableDensity
  hidden: string[]
  /** Column ids pinned to the left, on top of whatever the screen pinned by default. */
  pinned: string[]
}

export const DEFAULT_PAGE_SIZE = 50
export const PAGE_SIZES = [25, 50, 100, 200] as const

export const emptyTableState = (
  overrides: Partial<DataTableState> = {},
): DataTableState => ({
  search: '',
  sorting: [],
  filters: [],
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
  density: 'default',
  hidden: [],
  pinned: [],
  ...overrides,
})

export const isFilterEmpty = (filter: ColumnFilter): boolean => {
  switch (filter.kind) {
    case 'text':
      return filter.value.trim() === ''
    case 'select':
      return filter.values.length === 0
    case 'number':
      return filter.min === null && filter.max === null
    case 'date':
      return filter.from === null && filter.to === null
    case 'boolean':
      return false
  }
}

/**
 * Setting a filter to its empty value removes it. A filter that is present but matches everything
 * would still show as a chip, and a chip that does nothing is worse than no chip.
 */
export function setFilter(
  filters: readonly ColumnFilter[],
  next: ColumnFilter,
): ColumnFilter[] {
  const rest = filters.filter((filter) => filter.id !== next.id)
  return isFilterEmpty(next) ? rest : [...rest, next]
}

export const removeFilter = (
  filters: readonly ColumnFilter[],
  id: string,
): ColumnFilter[] => filters.filter((filter) => filter.id !== id)

export const findFilter = (
  filters: readonly ColumnFilter[],
  id: string,
): ColumnFilter | undefined => filters.find((filter) => filter.id === id)

/**
 * Ascending, descending, then off. The third click matters: without it a column can be sorted but
 * never unsorted, and the operator has to reload the page to get the natural order back.
 *
 * A plain click replaces the sort; shift-click appends, which is how "by area, then by joint
 * number" gets expressed without a dialog.
 */
export function toggleSort(
  sorting: readonly ColumnSort[],
  id: string,
  { additive = false }: { additive?: boolean } = {},
): ColumnSort[] {
  const current = sorting.find((sort) => sort.id === id)
  const others = additive ? sorting.filter((sort) => sort.id !== id) : []

  if (!current) return [...others, { id, desc: false }]
  if (!current.desc) return [...others, { id, desc: true }]
  return [...others]
}

export const sortDirection = (
  sorting: readonly ColumnSort[],
  id: string,
): 'asc' | 'desc' | null => {
  const found = sorting.find((sort) => sort.id === id)
  return found ? (found.desc ? 'desc' : 'asc') : null
}

/** `aria-sort` takes the words, not the abbreviations, and only on the column actually sorted. */
export const ariaSort = (
  sorting: readonly ColumnSort[],
  id: string,
): 'ascending' | 'descending' | 'none' => {
  const direction = sortDirection(sorting, id)
  return direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'
}

export const activeFilterCount = (state: DataTableState): number =>
  state.filters.length + (state.search.trim() === '' ? 0 : 1)

// ---------------------------------------------------------------------------------------------
// URL serialisation
//
// Short keys, because these end up in a link someone pastes into a message. `|` separates the
// members of a list and `~` the ends of a range; both are encoded out of the values themselves so
// a spool number containing either cannot split its own filter.
// ---------------------------------------------------------------------------------------------

const enc = encodeURIComponent
const dec = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    // A hand-edited or truncated link should degrade to a weaker filter, never to a crash.
    return value
  }
}

const encodeFilter = (filter: ColumnFilter): string => {
  switch (filter.kind) {
    case 'text':
      return `${enc(filter.id)}:txt:${enc(filter.value)}`
    case 'select':
      return `${enc(filter.id)}:in:${filter.values.map(enc).join('|')}`
    case 'number':
      return `${enc(filter.id)}:num:${filter.min ?? ''}~${filter.max ?? ''}`
    case 'date':
      return `${enc(filter.id)}:date:${filter.from ?? ''}~${filter.to ?? ''}`
    case 'boolean':
      return `${enc(filter.id)}:bool:${filter.value ? '1' : '0'}`
  }
}

const decodeFilter = (token: string): ColumnFilter | null => {
  const [rawId, kind, ...rest] = token.split(':')
  const raw = rest.join(':')
  if (!rawId || !kind) return null
  const id = dec(rawId)

  switch (kind) {
    case 'txt':
      return { id, kind: 'text', value: dec(raw) }
    case 'in': {
      const values = raw.split('|').filter(Boolean).map(dec)
      return values.length ? { id, kind: 'select', values } : null
    }
    case 'num': {
      const [min, max] = raw.split('~')
      const toNumber = (value: string) => (value === '' || Number.isNaN(Number(value)) ? null : Number(value))
      const filter: ColumnFilter = { id, kind: 'number', min: toNumber(min ?? ''), max: toNumber(max ?? '') }
      return isFilterEmpty(filter) ? null : filter
    }
    case 'date': {
      const [from, to] = raw.split('~')
      const filter: ColumnFilter = { id, kind: 'date', from: from || null, to: to || null }
      return isFilterEmpty(filter) ? null : filter
    }
    case 'bool':
      return { id, kind: 'boolean', value: raw === '1' }
    default:
      return null
  }
}

/**
 * Only what differs from the default is written. A pristine table leaves the URL alone, so the
 * address bar stays readable and "no query string" keeps meaning "the default view".
 */
export function encodeTableState(
  state: DataTableState,
  defaults: DataTableState = emptyTableState(),
): URLSearchParams {
  const params = new URLSearchParams()

  if (state.search.trim()) params.set('q', state.search)
  if (state.sorting.length) {
    params.set('sort', state.sorting.map((sort) => `${enc(sort.id)}:${sort.desc ? 'desc' : 'asc'}`).join(','))
  }
  if (state.filters.length) params.set('f', state.filters.map(encodeFilter).join(','))
  if (state.pageIndex > 0) params.set('page', String(state.pageIndex + 1))
  if (state.pageSize !== defaults.pageSize) params.set('size', String(state.pageSize))
  if (state.density !== defaults.density) params.set('d', state.density)
  if (state.hidden.length) params.set('hide', state.hidden.map(enc).join(','))
  if (state.pinned.length) params.set('pin', state.pinned.map(enc).join(','))

  return params
}

const DENSITIES = new Set<TableDensity>(['compact', 'default', 'comfortable'])

export function decodeTableState(
  params: URLSearchParams | string,
  defaults: DataTableState = emptyTableState(),
): DataTableState {
  const search = typeof params === 'string' ? new URLSearchParams(params) : params

  const sorting = (search.get('sort') ?? '')
    .split(',')
    .filter(Boolean)
    .map((token) => {
      const [id, direction] = token.split(':')
      return { id: dec(id ?? ''), desc: direction === 'desc' }
    })
    .filter((sort) => sort.id !== '')

  const filters = (search.get('f') ?? '')
    .split(',')
    .filter(Boolean)
    .map(decodeFilter)
    .filter((filter): filter is ColumnFilter => filter !== null)

  const page = Number(search.get('page'))
  const size = Number(search.get('size'))
  const density = search.get('d') as TableDensity | null

  return {
    search: search.get('q') ?? defaults.search,
    sorting: sorting.length ? sorting : defaults.sorting,
    filters: filters.length ? filters : defaults.filters,
    // Pages are one-based in the URL because that is what the operator sees in the footer, and
    // zero-based in state because that is what the table needs.
    pageIndex: Number.isFinite(page) && page > 0 ? page - 1 : defaults.pageIndex,
    pageSize: Number.isFinite(size) && size > 0 ? size : defaults.pageSize,
    density: density && DENSITIES.has(density) ? density : defaults.density,
    hidden: (search.get('hide') ?? '').split(',').filter(Boolean).map(dec),
    pinned: (search.get('pin') ?? '').split(',').filter(Boolean).map(dec),
  }
}
