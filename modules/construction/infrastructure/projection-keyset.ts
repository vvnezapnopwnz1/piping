/**
 * The spool lists of fabrication and erection read the same projection and page it the same way,
 * so the request pieces live here once. Each repository names its own columns; nothing here knows
 * which screen is calling.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows are mapped by each repository
export type ProjectionRow = Record<string, any>

/** Supabase's fluent builder, narrowed to what the row read and the count-only read share. */
export type ProjectionRequest = {
  eq: (column: string, value: string | number | boolean) => ProjectionRequest
  is: (column: string, value: null) => ProjectionRequest
  gte: (column: string, value: number | string) => ProjectionRequest
  lte: (column: string, value: number | string) => ProjectionRequest
  ilike: (column: string, value: string) => ProjectionRequest
  or: (filters: string) => ProjectionRequest
  order: (column: string, options: { ascending: boolean }) => ProjectionRequest
  limit: (count: number) => PromiseLike<{
    data: ProjectionRow[] | null
    error: { code?: string; message?: string } | null
  }>
}

export interface NumberRange {
  min: number | null
  max: number | null
}

export interface DateRange {
  from: string | null
  to: string | null
}

/** The compact cursor of the natural order: ISO, spool, then the revision id as a tie-break. */
export interface IsoCursor {
  isoNumber: string
  spoolNumber: string
  spoolRevisionId: string
}

export const quotePostgrestValue = (value: string): string =>
  `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`

const textPattern = (value: string): string => quotePostgrestValue(`%${value}%`)

export const cursorValue = (value: string | number | boolean): string =>
  typeof value === "string" ? quotePostgrestValue(value) : String(value)

export const applySpoolSearch = <Request extends ProjectionRequest>(request: Request, search: string): Request => {
  if (!search) return request
  const pattern = textPattern(search)
  return request.or(`spool_number.ilike.${pattern},iso_number.ilike.${pattern}`) as Request
}

export const applyContains = <Request extends ProjectionRequest>(
  request: Request,
  column: string,
  value: string | null,
): Request => (value ? (request.ilike(column, `%${value}%`) as Request) : request)

/** `null` among the stages is the "not started" label, which the projection stores as NULL. */
export const applyStages = <Request extends ProjectionRequest>(
  request: Request,
  column: string,
  stages: ReadonlyArray<string | null> | null,
): Request => {
  if (!stages) return request
  const known = stages.filter((stage): stage is string => stage !== null)
  const clauses = [
    ...(stages.includes(null) ? [`${column}.is.null`] : []),
    ...(known.length ? [`${column}.in.(${known.map(quotePostgrestValue).join(",")})`] : []),
  ]
  return request.or(clauses.join(",")) as Request
}

export const applyNumberRange = <Request extends ProjectionRequest>(
  request: Request,
  column: string,
  range: NumberRange | null,
): Request => {
  let next = request
  if (range?.min !== null && range?.min !== undefined) next = next.gte(column, range.min) as Request
  if (range?.max !== null && range?.max !== undefined) next = next.lte(column, range.max) as Request
  return next
}

export const applyDateRange = <Request extends ProjectionRequest>(
  request: Request,
  column: string,
  range: DateRange | null,
): Request => {
  let next = request
  if (range?.from) next = next.gte(column, range.from) as Request
  if (range?.to) next = next.lte(column, range.to) as Request
  return next
}

export const applyBoolean = <Request extends ProjectionRequest>(
  request: Request,
  column: string,
  value: boolean | null,
): Request => (value === null ? request : (request.eq(column, value) as Request))

/** Keyset step in the ISO, spool, id order, ascending or descending. */
export const applyIsoKeyset = <Request extends ProjectionRequest>(
  request: Request,
  cursor: IsoCursor,
  desc: boolean,
): Request => {
  const step = desc ? "lt" : "gt"
  const iso = quotePostgrestValue(cursor.isoNumber)
  const spool = quotePostgrestValue(cursor.spoolNumber)
  const id = quotePostgrestValue(cursor.spoolRevisionId)
  return request.or(
    `iso_number.${step}.${iso},and(iso_number.eq.${iso},spool_number.${step}.${spool}),and(iso_number.eq.${iso},spool_number.eq.${spool},spool_revision_id.${step}.${id})`,
  ) as Request
}

/** Keyset step on one sorted column, with the revision id breaking ties. */
export const applyColumnKeyset = <Request extends ProjectionRequest>(
  request: Request,
  column: string,
  value: string | number | boolean,
  spoolRevisionId: string,
  desc: boolean,
): Request => {
  const step = desc ? "lt" : "gt"
  const quoted = cursorValue(value)
  const id = quotePostgrestValue(spoolRevisionId)
  return request.or(`${column}.${step}.${quoted},and(${column}.eq.${quoted},spool_revision_id.${step}.${id})`) as Request
}
