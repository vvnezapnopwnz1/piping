import assert from "node:assert/strict"
import test from "node:test"
import { listTestPackCatalog, createTestPack, assignLineCheck, listProjectIsometricNumbers, listProjectLineServices, listProjectPunchCodes, listProjectServiceClasses, listProjectSubsystems, listProjectSystems } from "./supabase-pressure-test-repository"

type Call = [string, ...unknown[]]

/** Records the whole PostgREST chain so a missing project or status filter is visible. */
function recordingClient(calls: Call[], data: unknown[] = []) {
  const builder = {
    select: (columns: string) => { calls.push(["select", columns]); return builder },
    eq: (field: string, value: unknown) => { calls.push(["eq", field, value]); return builder },
    order: (column: string) => { calls.push(["order", column]); return Promise.resolve({ data, error: null }) },
  }
  return { from: (name: string) => { calls.push(["from", name]); return builder } } as never
}

function filters(calls: Call[]): Call[] {
  return calls.filter((call) => call[0] === "eq")
}

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

test("Builder reference loaders read the active rows of the current project only", async () => {
  for (const [load, table] of [
    [listProjectSystems, "project_systems"],
    [listProjectServiceClasses, "project_service_classes"],
    [listProjectLineServices, "project_line_services"],
    [listProjectPunchCodes, "project_punch_codes"],
  ] as const) {
    const calls: Call[] = []
    await load(recordingClient(calls), "project-1")
    assert.deepEqual(calls[0], ["from", table])
    assert.deepEqual(filters(calls), [["eq", "project_id", "project-1"], ["eq", "status", "active"]], `${table} must be project scoped and active only`)
    assert.deepEqual(calls.at(-1), ["order", "code"])
  }
})

test("subsystem options carry the owning system so the selector can depend on it", async () => {
  const calls: Call[] = []
  const rows = await listProjectSubsystems(
    recordingClient(calls, [{ id: "sub-feed", code: "SUB-FEED", description: "Process feed subsystem", system_id: "sys-process" }]),
    "project-1",
  )
  assert.deepEqual(calls[0], ["from", "project_subsystems"])
  assert.match(String(calls[1][1]), /system_id/)
  assert.deepEqual(filters(calls), [["eq", "project_id", "project-1"], ["eq", "status", "active"]])
  assert.deepEqual(rows, [{ id: "sub-feed", code: "SUB-FEED", description: "Process feed subsystem", systemId: "sys-process" }])
})

test("ISO numbers are resolved from the current project so the Builder can label readiness rows", async () => {
  const calls: Call[] = []
  const rows = await listProjectIsometricNumbers(
    recordingClient(calls, [{ id: "iso-1001", iso_number: "ISO-DEMO-1001" }]),
    "project-1",
  )
  assert.deepEqual(calls[0], ["from", "isometrics"])
  assert.deepEqual(filters(calls), [["eq", "project_id", "project-1"]])
  assert.deepEqual(rows, [{ id: "iso-1001", isoNumber: "ISO-DEMO-1001" }])
})

test("reference loaders map the persisted business columns without inventing labels", async () => {
  const calls: Call[] = []
  const rows = await listProjectPunchCodes(
    recordingClient(calls, [{ id: "punch-x", code: "X-DEMO", description: "Category X punch raised during Line Check", status: "active" }]),
    "project-1",
  )
  assert.deepEqual(rows, [{ id: "punch-x", code: "X-DEMO", description: "Category X punch raised during Line Check" }])
})
