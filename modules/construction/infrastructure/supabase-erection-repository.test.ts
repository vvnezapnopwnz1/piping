import assert from "node:assert/strict"
import test from "node:test"

import {
  emptyErectionSpoolQuery,
  loadErectionSpoolPage,
  loadErectionSpoolStageFacets,
  toErectionSpool,
  toErectionSpoolCursor,
} from "./supabase-erection-repository"

const projectionRow = (id: string, overrides: Record<string, unknown> = {}) => ({
  spool_revision_id: id,
  project_id: "project-1",
  iso_number: "ISO-A",
  spool_number: `SP-${id}`,
  revision_number: "R0",
  revision_status: "accepted",
  material_line_total: 2,
  material_line_checked: 2,
  field_weld_total: 3,
  field_weld_complete: 1,
  field_support_total: 1,
  field_support_recorded: 0,
  to_site_on: "2026-09-01",
  erected_on: null,
  welded_bolted_on: null,
  supported_on: null,
  field_nde_pending: 4,
  field_pwht_pending: 2,
  is_rft: false,
  rft_on: null,
  rft_blockers: [],
  ...overrides,
})

type Call = { method: string; args: unknown[] }
type Recorded = { head: boolean; calls: Call[] }

/** Records every builder call so a test can read the request that would have gone to PostgREST. */
function recordingClient(options: { rows?: unknown[]; count?: number } = {}) {
  const requests: Recorded[] = []
  const builderFor = (head: boolean) => {
    const record: Recorded = { head, calls: [] }
    requests.push(record)
    const builder: Record<string, unknown> = {}
    for (const method of ["eq", "is", "gte", "lte", "ilike", "or", "order"]) {
      builder[method] = (...args: unknown[]) => {
        record.calls.push({ method, args })
        return builder
      }
    }
    builder.limit = async (count: number) => {
      record.calls.push({ method: "limit", args: [count] })
      return { data: options.rows ?? [], error: null }
    }
    builder.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, count: options.count ?? 0, error: null }).then(resolve)
    return builder
  }
  const client = {
    from: () => ({
      select: (_columns: string, selectOptions?: { head?: boolean }) => builderFor(selectOptions?.head === true),
    }),
  }
  return { client: client as never, requests }
}

const callsOf = (requests: Recorded[], head: boolean) => requests.find((request) => request.head === head)!.calls

test("the projection's field counters read back as the readiness row's open evidence", () => {
  const spool = toErectionSpool(projectionRow("1"))
  assert.equal(spool.ndePending, 4)
  assert.equal(spool.pwhtPending, 2)
  assert.equal(spool.fieldWeldComplete, 1)
  assert.equal(spool.isRft, false)
})

test("a page reports the filtered total and a cursor when more rows follow", async () => {
  const { client } = recordingClient({ count: 94, rows: [projectionRow("1"), projectionRow("2"), projectionRow("3")] })
  const page = await loadErectionSpoolPage(client, "project-1", null, emptyErectionSpoolQuery(), 2)

  assert.equal(page.totalCount, 94)
  assert.equal(page.rows.length, 2)
  assert.deepEqual(page.nextCursor, { isoNumber: "ISO-A", spoolNumber: "SP-2", spoolRevisionId: "2" })
})

test("the last page has no cursor", async () => {
  const { client } = recordingClient({ count: 2, rows: [projectionRow("1"), projectionRow("2")] })
  const page = await loadErectionSpoolPage(client, "project-1", null, emptyErectionSpoolQuery(), 2)
  assert.equal(page.nextCursor, null)
})

test("every table filter reaches both the row read and the count read", async () => {
  const { client, requests } = recordingClient({ count: 1, rows: [] })
  await loadErectionSpoolPage(
    client,
    "project-1",
    null,
    {
      ...emptyErectionSpoolQuery(),
      search: "iso-3",
      spoolNumber: "S1",
      spoolRevisionId: "rev-9",
      stages: [null, "rft"],
      ndePending: { min: 1, max: null },
      pwhtPending: { min: null, max: 3 },
      toSiteOn: { from: "2026-09-01", to: "2026-09-30" },
      isRft: false,
    },
    50,
  )

  for (const head of [true, false]) {
    const calls = callsOf(requests, head)
    const has = (method: string, ...args: unknown[]) =>
      calls.some((call) => call.method === method && JSON.stringify(call.args) === JSON.stringify(args))
    assert.ok(has("eq", "project_id", "project-1"), `project, head=${head}`)
    assert.ok(has("eq", "spool_revision_id", "rev-9"), `spool, head=${head}`)
    assert.ok(has("ilike", "spool_number", "%S1%"), `spool text, head=${head}`)
    assert.ok(has("or", 'current_erection_stage.is.null,current_erection_stage.in.("rft")'), `stages, head=${head}`)
    assert.ok(has("gte", "field_nde_pending", 1), `nde min, head=${head}`)
    assert.ok(has("lte", "field_pwht_pending", 3), `pwht max, head=${head}`)
    assert.ok(has("gte", "to_site_on", "2026-09-01"), `date from, head=${head}`)
    assert.ok(has("lte", "to_site_on", "2026-09-30"), `date to, head=${head}`)
    assert.ok(has("eq", "is_rft", false), `rft, head=${head}`)
    assert.ok(
      calls.some((call) => call.method === "or" && String(call.args[0]).startsWith("spool_number.ilike.")),
      `search, head=${head}`,
    )
  }
})

test("a sorted page carries the sorted value so the next page continues from it", async () => {
  const sort = { id: "ndePending", desc: true } as const
  const first = recordingClient({
    count: 9,
    rows: [projectionRow("1", { field_nde_pending: 5 }), projectionRow("2", { field_nde_pending: 3 })],
  })
  const page = await loadErectionSpoolPage(first.client, "project-1", null, { ...emptyErectionSpoolQuery(), sort }, 1)
  assert.deepEqual(page.nextCursor?.sort, { id: "ndePending", value: 5, desc: true })

  const second = recordingClient({ count: 9, rows: [] })
  await loadErectionSpoolPage(second.client, "project-1", page.nextCursor, { ...emptyErectionSpoolQuery(), sort }, 1)
  const rows = callsOf(second.requests, false)
  assert.ok(
    rows.some(
      (call) =>
        call.method === "or" &&
        call.args[0] === 'field_nde_pending.lt.5,and(field_nde_pending.eq.5,spool_revision_id.lt."1")',
    ),
  )
  assert.deepEqual(
    rows.filter((call) => call.method === "order").map((call) => call.args),
    [
      ["field_nde_pending", { ascending: false }],
      ["spool_revision_id", { ascending: false }],
    ],
  )
})

test("a cursor for another sort order is ignored rather than misapplied", async () => {
  const stale = toErectionSpoolCursor(toErectionSpool(projectionRow("1")), { id: "ndePending", desc: false })
  const { client, requests } = recordingClient({ count: 1, rows: [] })
  await loadErectionSpoolPage(
    client,
    "project-1",
    stale,
    { ...emptyErectionSpoolQuery(), sort: { id: "isRft", desc: false } },
    10,
  )
  assert.equal(callsOf(requests, false).some((call) => call.method === "or"), false)
})

test("ISO ascending keeps the compact three-field cursor", () => {
  const spool = toErectionSpool(projectionRow("1"))
  assert.deepEqual(toErectionSpoolCursor(spool, { id: "isoNumber", desc: false }), {
    isoNumber: "ISO-A",
    spoolNumber: "SP-1",
    spoolRevisionId: "1",
  })
})

test("the stage catalog counts the whole project, in field order, including empty stages", async () => {
  const { client, requests } = recordingClient({ count: 7 })
  const facets = await loadErectionSpoolStageFacets(client, "project-1")

  assert.deepEqual(
    facets.map((facet) => facet.stage),
    [null, "to_site", "erected", "welded_bolted", "supported", "rft"],
  )
  assert.equal(requests.length, 6)
  assert.ok(requests.every((request) => request.head))
  // The catalog is not narrowed by whatever the table is currently filtered to.
  assert.ok(requests.every((request) => !request.calls.some((call) => call.method === "ilike" || call.method === "or")))
})
