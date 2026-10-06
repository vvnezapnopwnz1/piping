import assert from "node:assert/strict"
import test from "node:test"
import {
  loadTestPackWorkspaceSnapshot,
  readCompleteScopedRows,
  type TestPackLoaderRepository,
} from "./test-pack-workspace-loader"
import type { TestPackCatalogRow } from "../infrastructure/supabase-pressure-test-repository"

test("readCompleteScopedRows loads 0 rows gracefully", async () => {
  const result = await readCompleteScopedRows(async () => ({ rows: [], total: 0 }), 100)
  assert.deepEqual(result, [])
})

test("readCompleteScopedRows paginates across multiple pages to collect exact rows", async () => {
  const total = 1001
  const pages: [number, number][] = []
  const result = await readCompleteScopedRows(
    async (from, to) => {
      pages.push([from, to])
      const count = Math.min(to - from + 1, total - from)
      const rows = Array.from({ length: count }, (_, i) => `row-${from + i}`)
      return { rows, total }
    },
    500,
  )
  assert.equal(result.length, 1001)
  assert.equal(pages.length, 3)
  assert.deepEqual(pages, [
    [0, 499],
    [500, 999],
    [1000, 1499],
  ])
})

test("readCompleteScopedRows rejects if total count changes mid-stream", async () => {
  let call = 0
  await assert.rejects(
    async () => {
      await readCompleteScopedRows(
        async () => {
          call++
          return { rows: Array(10).fill("row"), total: call === 1 ? 25 : 30 }
        },
        10,
      )
    },
    { message: /Worklist changed while loading/ },
  )
})

test("readCompleteScopedRows rejects on silent API cap", async () => {
  await assert.rejects(
    async () => {
      await readCompleteScopedRows(
        async () => {
          // returns 5 rows when 10 were requested, but total claims 20
          return { rows: Array(5).fill("row"), total: 20 }
        },
        10,
      )
    },
    { message: /Worklist is incomplete/ },
  )
})

test("readCompleteScopedRows rejects invalid pageSize", async () => {
  await assert.rejects(
    async () => {
      await readCompleteScopedRows(async () => ({ rows: [], total: 0 }), 0)
    },
    { message: /Page size must be positive/ },
  )
  await assert.rejects(
    async () => {
      await readCompleteScopedRows(async () => ({ rows: [], total: 0 }), -5)
    },
    { message: /Page size must be positive/ },
  )
})

function createFakeRepo(overrides: Partial<TestPackLoaderRepository> = {}): {
  repo: TestPackLoaderRepository
  calls: string[]
} {
  const calls: string[] = []
  const basePack: TestPackCatalogRow = {
    id: "pack-1",
    projectId: "proj-1",
    testPackNumber: "TP-001",
    revisionNo: 1,
    lifecycle: "active",
    activeIsoCount: 2,
    systemId: "sys-1",
    subsystemId: "sub-1",
    serviceClassId: "sc-1",
    lineServiceId: "ls-1",
    pressureUnit: "psi",
    pressure: 150,
  }

  const repo: TestPackLoaderRepository = {
    getTestPackCatalogRow: async (_p, id) => {
      calls.push(`getTestPackCatalogRow:${id}`)
      return id === "pack-1" ? basePack : null
    },
    getTestPackReadinessRow: async (_p, id) => {
      calls.push(`getTestPackReadinessRow:${id}`)
      return {
        testPackId: id,
        projectId: "proj-1",
        testPackNumber: "TP-001",
        revisionNo: 1,
        memberCount: 2,
        isRft: false,
      } as never
    },
    listTestPackMembers: async () => {
      calls.push("listTestPackMembers")
      return []
    },
    listTestPackIsoStatus: async () => {
      calls.push("listTestPackIsoStatus")
      return []
    },
    listTestPackSpoolStatus: async () => {
      calls.push("listTestPackSpoolStatus")
      return []
    },
    listLineCheckWorklist: async () => {
      calls.push("listLineCheckWorklist")
      return []
    },
    listItemClearanceWorklist: async () => {
      calls.push("listItemClearanceWorklist")
      return []
    },
    listBlindingWorklist: async () => {
      calls.push("listBlindingWorklist")
      return []
    },
    listTestingPrecommWorklist: async () => {
      calls.push("listTestingPrecommWorklist")
      return []
    },
    listReinstatementWorklist: async () => {
      calls.push("listReinstatementWorklist")
      return []
    },
    listTestPackReinstatementTargets: async () => {
      calls.push("listTestPackReinstatementTargets")
      return []
    },
    listFlangeReinstatementRecords: async () => {
      calls.push("listFlangeReinstatementRecords")
      return []
    },
    listProjectSystems: async () => {
      calls.push("listProjectSystems")
      return [{ id: "sys-1", code: "SYS-A", description: "System A" }]
    },
    listProjectSubsystems: async () => {
      calls.push("listProjectSubsystems")
      return [{ id: "sub-1", code: "SUB-A", description: "Subsystem A", systemId: "sys-1" }]
    },
    listProjectServiceClasses: async () => {
      calls.push("listProjectServiceClasses")
      return [{ id: "sc-1", code: "SC-100", description: null }]
    },
    listProjectLineServices: async () => {
      calls.push("listProjectLineServices")
      return [{ id: "ls-1", code: "LS-1", description: "Line service" }]
    },
    getProjectPressureUnit: async () => {
      calls.push("getProjectPressureUnit")
      return "bar"
    },
    ...overrides,
  }
  return { repo, calls }
}

test("loadTestPackWorkspaceSnapshot returns unavailable and skips detail reads when pack is missing", async () => {
  const { repo, calls } = createFakeRepo()
  const res = await loadTestPackWorkspaceSnapshot(repo, "proj-1", "non-existent")
  assert.equal(res.status, "unavailable")
  assert.deepEqual(calls, ["getTestPackCatalogRow:non-existent"])
})

test("loadTestPackWorkspaceSnapshot returns unavailable when packId is null", async () => {
  const { repo, calls } = createFakeRepo()
  const res = await loadTestPackWorkspaceSnapshot(repo, "proj-1", null)
  assert.equal(res.status, "unavailable")
  assert.equal(calls.length, 0)
})

test("loadTestPackWorkspaceSnapshot loads full snapshot and maps references and pressureUnit", async () => {
  const { repo } = createFakeRepo()
  const res = await loadTestPackWorkspaceSnapshot(repo, "proj-1", "pack-1")
  assert.equal(res.status, "available")
  if (res.status === "available") {
    assert.equal(res.snapshot.pack.id, "pack-1")
    assert.equal(res.snapshot.pressureUnit, "psi")
    assert.equal(res.snapshot.referenceLabels.system, "SYS-A · System A")
    assert.equal(res.snapshot.referenceLabels.serviceClass, "SC-100")
    assert.equal(res.snapshot.readiness?.testPackId, "pack-1")
  }
})

test("loadTestPackWorkspaceSnapshot preserves null readiness without inventing truth", async () => {
  const { repo } = createFakeRepo({
    getTestPackReadinessRow: async () => null,
  })
  const res = await loadTestPackWorkspaceSnapshot(repo, "proj-1", "pack-1")
  assert.equal(res.status, "available")
  if (res.status === "available") {
    assert.equal(res.snapshot.readiness, null)
  }
})

test("loadTestPackWorkspaceSnapshot rethrows detail read failures and does not return empty snapshot", async () => {
  const { repo } = createFakeRepo({
    listTestPackMembers: async () => {
      throw new Error("Network timeout on members read")
    },
  })
  await assert.rejects(
    async () => {
      await loadTestPackWorkspaceSnapshot(repo, "proj-1", "pack-1")
    },
    { message: /Network timeout on members read/ },
  )
})

test("loadTestPackWorkspaceSnapshot reports Reference unavailable for inactive/deleted reference IDs", async () => {
  const { repo } = createFakeRepo({
    listProjectSystems: async () => [],
  })
  const res = await loadTestPackWorkspaceSnapshot(repo, "proj-1", "pack-1")
  assert.equal(res.status, "available")
  if (res.status === "available") {
    assert.equal(res.snapshot.referenceLabels.system, "Reference unavailable")
  }
})
