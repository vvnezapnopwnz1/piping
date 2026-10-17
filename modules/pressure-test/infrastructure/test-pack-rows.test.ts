import assert from "node:assert/strict"
import test from "node:test"

import { listTestPackWorkflowRows } from "./test-pack-rows"

const clientWith = (pages: Array<{ data: unknown[] | null; error: { message: string } | null }>) => {
  let call = 0
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    range: async () => pages[Math.min(call++, pages.length - 1)],
  }
  return { from: () => query } as never
}

test("every workflow row is read past the 1,000-row cap and keyed by pack id", async () => {
  const first = Array.from({ length: 1000 }, (_, i) => ({ test_pack_id: `p${i}`, canonical_state: "awaiting_rft" }))
  const second = Array.from({ length: 5 }, (_, i) => ({ test_pack_id: `q${i}`, canonical_state: "complete" }))
  const rows = await listTestPackWorkflowRows(clientWith([{ data: first, error: null }, { data: second, error: null }, { data: [], error: null }]), "project-1")
  assert.equal(Object.keys(rows).length, 1005)
  assert.equal(rows.q4.canonical_state, "complete")
})

test("a server error is thrown with the server's message", async () => {
  await assert.rejects(listTestPackWorkflowRows(clientWith([{ data: null, error: { message: "boom" } }]), "project-1"), /boom/)
})
