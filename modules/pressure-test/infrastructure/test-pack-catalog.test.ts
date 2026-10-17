import assert from "node:assert/strict"
import test from "node:test"

import { listTestPackCatalog } from "./supabase-pressure-test-repository"

test("the pack catalog is read past the 1,000-row cap", async () => {
  const pages = [
    Array.from({ length: 1000 }, (_, i) => ({ id: `p${i}`, test_pack_number: `TP-${i}` })),
    Array.from({ length: 3 }, (_, i) => ({ id: `q${i}`, test_pack_number: `TQ-${i}` })),
    [],
  ]
  let call = 0
  const query = { select: () => query, eq: () => query, order: () => query, range: async () => ({ data: pages[Math.min(call++, 2)], error: null }) }
  const packs = await listTestPackCatalog({ from: () => query } as never, "project-1")
  assert.equal(packs.length, 1003)
  assert.equal(packs[1002].testPackNumber, "TQ-2")
})
