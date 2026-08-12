import assert from "node:assert/strict"
import test from "node:test"

import {
  loadFabricationProgressSnapshot,
  loadTestPackRftSnapshot,
} from "./supabase-report-repository"

function queryClient(rows: Record<string, unknown>[], calls: unknown[], error: { message: string } | null = null) {
  return {
    from(table: string) {
      calls.push(["from", table])
      const query = {
        select(columns: string) { calls.push(["select", columns]); return query },
        eq(field: string, value: string) { calls.push(["eq", field, value]); return query },
        order(field: string) { calls.push(["order", field]); return query },
        then(resolve: (value: unknown) => void) { resolve({ data: rows, error }) },
      }
      return query
    },
  } as never
}

const request = {
  projectId: "project-a",
  projectCode: "EP-100",
  generatedAt: new Date("2026-08-09T10:00:00Z"),
}

test("fabrication snapshot is project-scoped and preserves read-model values", async () => {
  const calls: unknown[] = []
  const snapshot = await loadFabricationProgressSnapshot(queryClient([{
    spool_number: "SP-1", weld_number: "W-1", weld_location: "shop", wps_code: "WPS-1",
    welders: ["W-01"], weld_on: "2026-08-08", obligation_pending: 1, obligation_total: 2,
  }], calls), request)

  assert.deepEqual(snapshot.rows, [{
    spoolNumber: "SP-1", weldNumber: "W-1", weldLocation: "shop", wpsCode: "WPS-1",
    welders: ["W-01"], weldedOn: "2026-08-08", ndePending: 1, ndeTotal: 2,
  }])
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["from", "weld_progress_summary"])))
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["eq", "project_id", "project-a"])))
})

test("test pack snapshot is project-scoped and normalizes legacy null counts", async () => {
  const calls: unknown[] = []
  const snapshot = await loadTestPackRftSnapshot(queryClient([{
    test_pack_number: "TP-1", lifecycle: "active", is_rft: null, rft_on: null,
    member_count: null, spool_total: 3, weld_or_support_pending_count: 2, nde_pending_count: null,
    pwht_pending_count: 0, flange_pending_count: 1, line_check_pending_count: 1, x_open_count: 0,
  }], calls), request)

  assert.deepEqual(snapshot.rows, [{
    testPackNumber: "TP-1", lifecycle: "active", isRft: false, rftOn: null,
    memberCount: 0, spoolTotal: 3, weldOrSupportPendingCount: 2, ndePendingCount: 0,
    pwhtPendingCount: 0, flangePendingCount: 1, lineCheckPendingCount: 1, xOpenCount: 0,
  }])
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["from", "test_pack_readiness"])))
  assert.ok(calls.some((call) => JSON.stringify(call) === JSON.stringify(["eq", "project_id", "project-a"])))
})

test("report snapshot read errors remain visible to the caller", async () => {
  await assert.rejects(
    loadFabricationProgressSnapshot(queryClient([], [], { message: "read denied" }), request),
    /read denied/,
  )
})
