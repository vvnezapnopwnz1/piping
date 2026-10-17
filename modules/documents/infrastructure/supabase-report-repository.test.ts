import assert from "node:assert/strict"
import test from "node:test"

import { loadNdeRegister, loadTestPackSummary, loadWeldLog } from "./supabase-report-repository"

/** A PostgREST stand-in that serves `rows` in pages of at most `cap`, whatever range is asked for. */
function pagedClient(rows: Record<string, unknown>[], calls: unknown[], cap = 1000, error: { message: string } | null = null) {
  return {
    from(table: string) {
      calls.push(["from", table])
      let from = 0
      const query = {
        select(columns: string) { calls.push(["select", columns]); return query },
        eq(field: string, value: string) { calls.push(["eq", field, value]); return query },
        order(field: string) { calls.push(["order", field]); return query },
        range(start: number, end: number) { calls.push(["range", start, end]); from = start; return query },
        then(resolve: (value: unknown) => void) {
          resolve({ data: error ? null : rows.slice(from, from + cap), error })
        },
      }
      return query
    },
  } as never
}

const weldRow = (id: string) => ({
  weld_joint_revision_id: id, project_id: "project-a", isometric_id: "iso-1", iso_number: "ISO-1",
  revision_number: "R0", line_number: null, spool_number: "SP-1", weld_number: `W-${id}`, weld_location: "shop",
  weld_type_code: null, diameter_inch: 6, thickness_mm: null, wps_code: null, welder_codes: null, weld_on: null,
  nde_methods: null, nde_pending: 0, nde_rejected: 0, pwht_required: false, pwht_accepted: false,
  trace_numbers: null, test_pack_id: null, test_pack_number: null,
})

const has = (calls: unknown[], call: unknown[]) => calls.some((entry) => JSON.stringify(entry) === JSON.stringify(call))

test("the weld log loader reads past the row cap, ordered by a unique key", async () => {
  const calls: unknown[] = []
  const rows = await loadWeldLog(pagedClient(["1", "2", "3", "4", "5"].map(weldRow), calls, 2), { projectId: "project-a" })

  assert.equal(rows.length, 5)
  assert.ok(has(calls, ["from", "weld_log_rows"]))
  assert.ok(has(calls, ["eq", "project_id", "project-a"]))
  assert.ok(has(calls, ["order", "weld_joint_revision_id"]))
})

test("the weld log loader turns empty arrays and nulls into plain values", async () => {
  const [row] = await loadWeldLog(pagedClient([weldRow("1")], []), { projectId: "project-a" })

  assert.deepEqual(row.welderCodes, [])
  assert.deepEqual(row.ndeMethods, [])
  assert.deepEqual(row.traceNumbers, [])
  assert.equal(row.lineNumber, null)
  assert.equal(row.diameterInch, 6)
})

test("a test pack filter narrows the read to that pack", async () => {
  const calls: unknown[] = []
  await loadNdeRegister(pagedClient([], calls), { projectId: "project-a", testPackId: "tp-1" })

  assert.ok(has(calls, ["from", "nde_register_rows"]))
  assert.ok(has(calls, ["eq", "test_pack_id", "tp-1"]))
  assert.ok(has(calls, ["order", "obligation_id"]))
})

test("loader read errors remain visible to the caller", async () => {
  await assert.rejects(
    loadTestPackSummary(pagedClient([], [], 1000, { message: "read denied" }), { projectId: "project-a" }),
    /read denied/,
  )
})
