import assert from "node:assert/strict"
import test from "node:test"
import { listTestPackCatalog, createTestPack, assignLineCheck } from "./supabase-pressure-test-repository"

test("catalog query is project scoped", async () => {
  const calls: unknown[] = []
  const client = {
    from(name: string) {
      calls.push(["from", name])
      return { select: (columns: string) => { calls.push(["select", columns]); return { eq: (field: string, value: string) => { calls.push(["eq", field, value]); return { order: async () => ({ data: [], error: null }) } } } } }
    },
  } as never
  await listTestPackCatalog(client, "project-1")
  assert.deepEqual(calls[0], ["from", "test_pack_catalog"])
  assert.deepEqual(calls[2], ["eq", "project_id", "project-1"])
})
test("metadata and workflow writes use typed RPC payloads", async () => {
  const calls: unknown[] = []
  const client = { rpc(name: string, args: Record<string, unknown>) { calls.push([name, args]); return Promise.resolve({ data: { id: "row-1" }, error: null }) } } as never
  await createTestPack(client, "project-1", { testPackNumber: "TP-1", location: "Unit", priority: "High", medium: "P", pressure: 12, plannedStartOn: "2026-08-10", plannedEndOn: "2026-08-11", systemId: "sys", subsystemId: "sub", serviceClassId: "sc", lineServiceId: "ls", isoIds: [] }, "key-1")
  await assignLineCheck(client, { testPackId: "pack-1", isometricIds: ["iso-1"], teamId: "team-1", assignedDate: "2026-08-12" }, "key-2")
  assert.equal((calls[0] as [string])[0], "create_test_pack")
  assert.equal((calls[1] as [string])[0], "assign_line_check")
  assert.equal((calls[1] as [string, Record<string, unknown>])[1].target_idempotency_key, "key-2")
})
