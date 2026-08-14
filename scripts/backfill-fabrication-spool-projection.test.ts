import assert from "node:assert/strict"
import test from "node:test"

import { backfillFabricationSpoolProjection } from "./backfill-fabrication-spool-projection"

const calls: string[] = []
const pages = new Map<string | null, readonly string[]>([
  [null, ["spool-001", "spool-002"]],
  ["spool-002", ["spool-003"]],
  ["spool-003", []],
])

test("backfill walks stable pages and refreshes every returned spool revision", async () => {
  const refreshed = await backfillFabricationSpoolProjection(
    {
      async listSpoolRevisionIds(afterId, limit) {
        calls.push(`list:${afterId ?? "start"}:${limit}`)
        return pages.get(afterId) ?? []
      },
      async recompute(spoolRevisionId) {
        calls.push(`refresh:${spoolRevisionId}`)
      },
    },
    2,
  )

  assert.equal(refreshed, 3)
  assert.deepEqual(calls, [
    "list:start:2",
    "refresh:spool-001",
    "refresh:spool-002",
    "list:spool-002:2",
    "refresh:spool-003",
    "list:spool-003:2",
  ])
})
