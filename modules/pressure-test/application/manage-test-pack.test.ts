import assert from "node:assert/strict"
import test from "node:test"
import { createManagedTestPack } from "./manage-test-pack"

test("invalid Test Pack metadata stops before repository RPC", async () => {
  let calls = 0
  const result = await createManagedTestPack({ rpc: async () => { calls += 1; return { data: null, error: null } } } as never, "project-1", {
    testPackNumber: " ", location: "Unit", priority: "High", medium: "P", pressure: 12, plannedStartOn: "2026-08-10", plannedEndOn: "2026-08-11", systemId: "sys", subsystemId: "sub", serviceClassId: "sc", lineServiceId: "ls", isoIds: [],
  })
  assert.equal(result.ok, false)
  assert.equal(calls, 0)
})
