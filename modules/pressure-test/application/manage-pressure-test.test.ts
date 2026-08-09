import assert from "node:assert/strict"
import test from "node:test"
import { recordManagedPressureTestStage } from "./manage-pressure-test"

test("invalid predecessor transition stops before RPC", async () => {
  let calls = 0
  const result = await recordManagedPressureTestStage({ rpc: async () => { calls += 1; return { data: null, error: null } } } as never, "pack-1", "awaiting_rft", "testing_started", "2026-08-10")
  assert.equal(result.ok, false)
  assert.equal(calls, 0)
})
