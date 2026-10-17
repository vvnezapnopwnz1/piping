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
      return { select: (columns: string) => { calls.push(["select", columns]); return { eq: (field: string, value: string) => { calls.push(["eq", field, value]); const page: any = { order: () => page, range: async () => ({ data: [], error: null }) }; return page } } } }
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

test("getTestPackCatalogRow maps pressure_unit and filters by project and id", async () => {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      calls.push(["from", table])
      const query = {
        select(cols: string) {
          calls.push(["select", cols])
          return query
        },
        eq(field: string, val: unknown) {
          calls.push(["eq", field, val])
          return query
        },
        maybeSingle: async () => ({
          data: {
            id: "tp-1",
            project_id: "p-1",
            test_pack_number: "TP-01",
            revision_no: 2,
            lifecycle: "active",
            active_iso_count: 3,
            pressure_unit: "psi",
            test_pressure: 150,
          },
          error: null,
        }),
      }
      return query
    },
  } as never
  const { getTestPackCatalogRow } = await import("./supabase-pressure-test-repository")
  const row = await getTestPackCatalogRow(client, "p-1", "tp-1")
  assert.deepEqual(calls, [
    ["from", "test_pack_catalog"],
    ["select", "*"],
    ["eq", "project_id", "p-1"],
    ["eq", "id", "tp-1"],
  ])
  assert.equal(row?.id, "tp-1")
  assert.equal(row?.pressureUnit, "psi")
  assert.equal(row?.pressure, 150)
})

test("getTestPackReadinessRow filters by project and test_pack_id", async () => {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      calls.push(["from", table])
      const query = {
        select(cols: string) {
          calls.push(["select", cols])
          return query
        },
        eq(field: string, val: unknown) {
          calls.push(["eq", field, val])
          return query
        },
        maybeSingle: async () => ({
          data: {
            test_pack_id: "tp-1",
            project_id: "p-1",
            test_pack_number: "TP-01",
            revision_no: 0,
            member_count: 2,
            is_rft: true,
          },
          error: null,
        }),
      }
      return query
    },
  } as never
  const { getTestPackReadinessRow } = await import("./supabase-pressure-test-repository")
  const row = await getTestPackReadinessRow(client, "p-1", "tp-1")
  assert.deepEqual(calls, [
    ["from", "test_pack_readiness"],
    ["select", "*"],
    ["eq", "project_id", "p-1"],
    ["eq", "test_pack_id", "tp-1"],
  ])
  assert.equal(row?.testPackId, "tp-1")
  assert.equal(row?.isRft, true)
})

test("getProjectPressureUnit reads project_pressure_units scoped to project", async () => {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      calls.push(["from", table])
      const query = {
        select(cols: string) {
          calls.push(["select", cols])
          return query
        },
        eq(field: string, val: unknown) {
          calls.push(["eq", field, val])
          return query
        },
        maybeSingle: async () => ({
          data: { unit: "bar" },
          error: null,
        }),
      }
      return query
    },
  } as never
  const { getProjectPressureUnit } = await import("./supabase-pressure-test-repository")
  const unit = await getProjectPressureUnit(client, "p-1")
  assert.deepEqual(calls, [
    ["from", "project_pressure_units"],
    ["select", "unit"],
    ["eq", "project_id", "p-1"],
  ])
  assert.equal(unit, "bar")
})

test("listTestPackReinstatementTargets returns empty when pack has no active members", async () => {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      calls.push(["from", table])
      const query = {
        select: () => query,
        eq: () => query,
        order: async () => ({ data: [], error: null }),
      }
      return query
    },
  } as never
  const { listTestPackReinstatementTargets } = await import("./supabase-pressure-test-repository")
  const targets = await listTestPackReinstatementTargets(client, "p-1", "tp-empty")
  assert.deepEqual(targets, [])
  assert.deepEqual(calls, [["from", "test_pack_member_worklist"]])
})

test("listTestPackReinstatementTargets queries flange readiness for active member ISOs only", async () => {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      calls.push(["from", table])
      if (table === "test_pack_member_worklist") {
        const query = {
          select: () => query,
          eq: (f: string, v: unknown) => {
            calls.push(["eq", f, v])
            return query
          },
          order: async () => ({
            data: [
              { isometric_id: "iso-1", removed_at: null },
              { isometric_id: "iso-removed", removed_at: "2026-08-01" },
            ],
            error: null,
          }),
        }
        return query
      }
      const query = {
        select: () => query,
        in: (f: string, v: unknown) => {
          calls.push(["in", f, v])
          return query
        },
        eq: (f: string, v: unknown) => {
          calls.push(["eq", f, v])
          return query
        },
        order: async () => ({
          data: [
            {
              flange_joint_revision_id: "flange-rev-1",
              isometric_id: "iso-1",
              category_code: "Y",
              requires_reinstatement: true,
              is_removed: false,
              revision_status: "accepted",
            },
          ],
          error: null,
        }),
      }
      return query
    },
  } as never
  const { listTestPackReinstatementTargets } = await import("./supabase-pressure-test-repository")
  const targets = await listTestPackReinstatementTargets(client, "p-1", "tp-1")
  assert.equal(targets.length, 1)
  assert.equal(targets[0].flange_joint_revision_id, "flange-rev-1")
  assert.deepEqual(calls, [
    ["from", "test_pack_member_worklist"],
    ["eq", "project_id", "p-1"],
    ["eq", "test_pack_id", "tp-1"],
    ["from", "flange_joint_readiness"],
    ["in", "isometric_id", ["iso-1"]],
    ["eq", "requires_reinstatement", true],
    ["eq", "is_removed", false],
    ["eq", "revision_status", "accepted"],
  ])
})

test("listFlangeReinstatementRecords returns empty without query for empty input", async () => {
  const calls: Call[] = []
  const client = {
    from: () => {
      calls.push(["from"])
    },
  } as never
  const { listFlangeReinstatementRecords } = await import("./supabase-pressure-test-repository")
  const records = await listFlangeReinstatementRecords(client, "p-1", [])
  assert.deepEqual(records, [])
  assert.equal(calls.length, 0)
})

