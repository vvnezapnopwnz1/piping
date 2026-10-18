interface PageResult<Row> {
  data: Row[] | null
  error: { message?: string } | null
}

/**
 * Reads a whole result set past PostgREST's `max_rows`. It asks for `pageSize` rows at a time, moves on by
 * the number of rows the server actually returned, and stops at the first empty page, so a server whose cap
 * is lower than `pageSize` loses nothing. `stopOnShortPage` trades that safety for one request less: use it
 * only when the server cap is known to be at least `pageSize`. The query behind `fetchPage` must be ordered by a unique key.
 */
export async function selectAllRows<Row>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<Row>>,
  pageSize = 1000,
  options: { stopOnShortPage?: boolean } = {},
): Promise<Row[]> {
  const rows: Row[] = []
  for (;;) {
    const { data, error } = await fetchPage(rows.length, rows.length + pageSize - 1)
    if (error) throw new Error(error.message || "Unable to load rows")
    if (!data || data.length === 0) return rows
    rows.push(...data)
    // The extra empty page costs a whole read; skip it where the server's cap is known to equal the page
    // (PostgREST's max_rows is 1,000 here) and the view behind it is expensive.
    if (options.stopOnShortPage && data.length < pageSize) return rows
  }
}
