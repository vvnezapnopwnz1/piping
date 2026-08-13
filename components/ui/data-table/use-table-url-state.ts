'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  decodeTableState,
  emptyTableState,
  encodeTableState,
  type DataTableState,
} from './table-state'

/**
 * Holds a table's state in the address bar.
 *
 * Every filter in this app used to live in a `useState` inside the screen, which meant a worklist
 * could not be linked to, the back button out of a record dropped it, and a reload threw away
 * whatever the operator had narrowed down to. All three are the same missing feature.
 *
 * `namespace` scopes the query keys so two tables on one page do not overwrite each other.
 */
export function useTableUrlState(
  options: {
    namespace?: string
    defaults?: Partial<DataTableState>
  } = {},
): [DataTableState, (next: DataTableState | ((current: DataTableState) => DataTableState)) => void] {
  const { namespace, defaults: defaultOverrides } = options
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // The caller almost always passes an inline object literal, which is a new reference on every
  // render; comparing its contents instead keeps that from re-seeding the table each time.
  const defaultsKey = JSON.stringify(defaultOverrides ?? {})
  const defaults = React.useMemo(() => emptyTableState(defaultOverrides), [defaultsKey])

  const prefix = namespace ? `${namespace}_` : ''
  const scoped = React.useCallback(
    (params: URLSearchParams) => {
      if (!prefix) return params
      const out = new URLSearchParams()
      for (const [key, value] of params) {
        if (key.startsWith(prefix)) out.set(key.slice(prefix.length), value)
      }
      return out
    },
    [prefix],
  )

  const fromUrl = React.useMemo(
    () => decodeTableState(scoped(new URLSearchParams(searchParams.toString())), defaults),
    [searchParams, scoped, defaults],
  )

  const [state, setState] = React.useState<DataTableState>(fromUrl)

  // The browser's back button changes the URL without going through `update`, so the URL stays
  // the authority and the local copy follows it. Comparing the encoded forms rather than the
  // objects keeps an identical state from bouncing back and forth.
  const encodedFromUrl = React.useMemo(
    () => encodeTableState(fromUrl, defaults).toString(),
    [fromUrl, defaults],
  )
  const encodedLocal = React.useMemo(
    () => encodeTableState(state, defaults).toString(),
    [state, defaults],
  )
  React.useEffect(() => {
    if (encodedFromUrl !== encodedLocal) setState(fromUrl)
    // Only a URL that moved should pull the table; a local edit is pushed by `update` instead.
  }, [encodedFromUrl])

  const update = React.useCallback(
    (next: DataTableState | ((current: DataTableState) => DataTableState)) => {
      setState((current) => {
        const resolved = typeof next === 'function' ? next(current) : next

        const params = new URLSearchParams(window.location.search)
        for (const key of [...params.keys()]) {
          if (key.startsWith(prefix) && OWNED_KEYS.has(key.slice(prefix.length))) params.delete(key)
        }
        for (const [key, value] of encodeTableState(resolved, defaults)) {
          params.set(`${prefix}${key}`, value)
        }

        const query = params.toString()
        // `replace`, not `push`: narrowing a filter five times should not cost five presses of
        // the back button to leave the screen.
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
        return resolved
      })
    },
    [defaults, pathname, prefix, router],
  )

  return [state, update]
}

/** Written and cleared by this hook; anything else in the query string is left alone. */
const OWNED_KEYS = new Set(['q', 'sort', 'f', 'page', 'size', 'd', 'hide', 'pin'])
