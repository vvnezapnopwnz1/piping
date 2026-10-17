interface PageResult<Row> {
  data: Row[] | null
  error: { message?: string } | null
}

/**
 * Reads a whole result set past PostgREST's `max_rows`. It asks for `pageSize` rows at a time, moves on by
 * the number of rows the server actually returned, and stops at the first empty page, so a server whose cap
 * is lower than `pageSize` loses nothing. The query behind `fetchPage` must be ordered by a unique key.
 */
export async function selectAllRows<Row>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<Row>>,
  pageSize = 1000,
): Promise<Row[]> {
  const rows: Row[] = []
  for (;;) {
    const { data, error } = await fetchPage(rows.length, rows.length + pageSize - 1)
    if (error) throw new Error(error.message || "Unable to load rows")
    if (!data || data.length === 0) return rows
    rows.push(...data)
  }
}
