import assert from "node:assert/strict"
import test from "node:test"

import {
  allocateNdeBatchCandidates,
  loadNdeBatchObligationCounts,
  previewNdeBatchCandidates,
  toObligation,
} from "./supabase-quality-repository"

const baseObligationRow = {
  project_id: "p-1",
  spool_revision_id: "sr-1",
  required_coverage: 100,
  selection_mode: "matrix",
  coverage_regime: "shop",
  cycle_kind: "original",
  cycle_ordinal: 1,
  parent_obligation_id: null,
  responsible_welder_qualification_id: null,
  spool_revisions: { spools: { spool_number: "SP-1" } },
}

// nde_obligations has no batch_id; the link is the nde_batch_items join table, which carries
// `unique (obligation_id)` (20260807091000_nde_batches_results.sql:27). So an obligation maps to at
// most one batch, and PostgREST embeds the join row as a to-one object rather than an array.
test("toObligation carries the batch number when the obligation has been allocated", () => {
  const allocated = toObligation({
    ...baseObligationRow,
    id: "ob-1",
    weld_joint_revision_id: "wjr-1",
    method: "rt",
    disposition: "issued",
    weld_joint_revisions: { weld_joints: { weld_number: "WJ-1" } },
    nde_batch_items: { nde_batches: { batch_number: "NB-20260811-0001" } },
  })
  assert.equal(allocated.batchNumber, "NB-20260811-0001")
  assert.equal(allocated.weldNumber, "WJ-1")
})

test("toObligation reports no batch for an obligation that has not been allocated", () => {
  const unallocated = toObligation({
    ...baseObligationRow,
    id: "ob-2",
    weld_joint_revision_id: "wjr-2",
    method: "pt",
    disposition: "pending",
    weld_joint_revisions: { weld_joints: { weld_number: "WJ-2" } },
    nde_batch_items: null,
  })
  assert.equal(unallocated.batchNumber, null)
})

function rpcClient(data: unknown, calls: unknown[]) {
  return {
    rpc(name: string, args: Record<string, unknown>) {
      calls.push([name, args])
      return Promise.resolve({ data, error: null })
    },
  } as never
}

// allocate_nde_batch_candidates `returns integer` — the allocated count — but the repository threw
// it away and returned void, so the screen could only report a fixed string.
test("allocateNdeBatchCandidates returns the count the RPC reports", async () => {
  const calls: unknown[] = []
  const allocated = await allocateNdeBatchCandidates(rpcClient(7, calls), "batch-1", 25, "key-1")
  assert.equal(allocated, 7)
  assert.deepEqual(calls, [[
    "allocate_nde_batch_candidates",
    { target_batch_id: "batch-1", target_percentage: 25, idempotency_key: "key-1" },
  ]])
})

test("allocateNdeBatchCandidates reports zero rather than undefined when the RPC returns nothing", async () => {
  assert.equal(await allocateNdeBatchCandidates(rpcClient(null, []), "batch-1", 100, "key-2"), 0)
})

// nde_batch_candidates is the same candidate set allocate uses internally, so previewing it before
// the click shows exactly what the commit would allocate.
test("previewNdeBatchCandidates maps the candidate rows the allocation would take", async () => {
  const calls: unknown[] = []
  const candidates = await previewNdeBatchCandidates(
    rpcClient(
      [
        { candidate_obligation_id: "ob-1", candidate_weld_number: "WJ-1", candidate_welded_on: "2026-08-01" },
        { candidate_obligation_id: "ob-2", candidate_weld_number: "WJ-2", candidate_welded_on: null },
      ],
      calls,
    ),
    "batch-1",
  )
  assert.deepEqual(candidates, [
    { obligationId: "ob-1", weldNumber: "WJ-1", weldedOn: "2026-08-01" },
    { obligationId: "ob-2", weldNumber: "WJ-2", weldedOn: null },
  ])
  assert.deepEqual(calls, [["nde_batch_candidates", { target_batch_id: "batch-1" }]])
})

test("previewNdeBatchCandidates treats an empty candidate set as an empty list", async () => {
  assert.deepEqual(await previewNdeBatchCandidates(rpcClient([], []), "batch-1"), [])
})

function selectClient(data: Record<string, unknown>[], calls: unknown[]) {
  return {
    from(table: string) {
      calls.push(["from", table])
      const query = {
        select(columns: string) { calls.push(["select", columns]); return query },
        eq(field: string, value: string) { calls.push(["eq", field, value]); return query },
        then(resolve: (value: unknown) => void) { resolve({ data, error: null }) },
      }
      return query
    },
  } as never
}

test("loadNdeBatchObligationCounts tallies join rows per batch within the project", async () => {
  const calls: unknown[] = []
  const counts = await loadNdeBatchObligationCounts(
    selectClient(
      [{ batch_id: "b-1" }, { batch_id: "b-1" }, { batch_id: "b-2" }],
      calls,
    ),
    "p-1",
  )
  assert.deepEqual(counts, { "b-1": 2, "b-2": 1 })
  assert.ok(
    calls.some((call) => Array.isArray(call) && call[0] === "eq" && call[1] === "nde_batches.project_id"),
    "the count must stay scoped to the visible project",
  )
})
