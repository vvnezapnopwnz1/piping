import assert from "node:assert/strict"

import {
  loadProjectDefinition,
  saveProjectDefinition,
} from "./project-definition"

const projectId = "a1111111-1111-4111-8111-111111111111"
const projectRow = {
  activity_code: "PQ-001",
  title: "PipeQC Project",
  owner_name: "Owner Company",
  contractor_name: "EPC Contractor",
  owner_logo_path: null,
  contractor_logo_path: "https://example.com/contractor.svg",
  maximum_transit_time_days: 14,
  updated_at: "2026-07-29T11:00:00.000Z",
}

const calls: Array<unknown> = []

const client = {
  from(table: string) {
    assert.equal(table, "projects")

    return {
      select(columns: string) {
        calls.push(["select", columns])
        return {
          eq(column: string, value: string) {
            calls.push(["eq", column, value])
            return {
              single: async () => ({ data: projectRow, error: null }),
            }
          },
        }
      },
      update(payload: unknown) {
        calls.push(["update", payload])
        return {
          eq(column: string, value: string) {
            calls.push(["eq", column, value])
            return {
              select(columns: string) {
                calls.push(["select", columns])
                return {
                  single: async () => ({ data: projectRow, error: null }),
                }
              },
            }
          },
        }
      },
    }
  },
  rpc(name: string, args: unknown) {
    calls.push(["rpc", name, args])
    return Promise.resolve({ data: true, error: null })
  },
} as never

async function run() {
  const loaded = await loadProjectDefinition(client, projectId)
  assert.deepEqual(loaded, {
    projectDefinition: {
      activityCode: "PQ-001",
      projectTitle: "PipeQC Project",
      owner: "Owner Company",
      contractor: "EPC Contractor",
      ownerLogoUrl: "",
      contractorLogoUrl: "https://example.com/contractor.svg",
      maxTransitTimeDays: 14,
      updatedAt: "2026-07-29T11:00:00.000Z",
    },
    canEdit: true,
  })
  assert.deepEqual(calls, [
    [
      "select",
      "activity_code, title, owner_name, contractor_name, owner_logo_path, contractor_logo_path, maximum_transit_time_days, updated_at",
    ],
    ["eq", "id", projectId],
    ["rpc", "can_administer_project", { target_project_id: projectId }],
  ])

  calls.length = 0
  const saved = await saveProjectDefinition(client, projectId, {
    activityCode: " pq-002 ",
    projectTitle: " PipeQC Project 2 ",
    owner: " Owner Company ",
    contractor: " EPC Contractor ",
    ownerLogoUrl: " ",
    contractorLogoUrl: " https://example.com/contractor.svg ",
    maxTransitTimeDays: 21,
  })
  assert.equal(saved.activityCode, "PQ-001")
  assert.deepEqual(calls, [
    [
      "update",
      {
        activity_code: "PQ-002",
        title: "PipeQC Project 2",
        owner_name: "Owner Company",
        contractor_name: "EPC Contractor",
        owner_logo_path: null,
        contractor_logo_path: "https://example.com/contractor.svg",
        maximum_transit_time_days: 21,
      },
    ],
    ["eq", "id", projectId],
    [
      "select",
      "activity_code, title, owner_name, contractor_name, owner_logo_path, contractor_logo_path, maximum_transit_time_days, updated_at",
    ],
  ])

  const readErrorClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: null,
            error: { message: "project read failed" },
          }),
        }),
      }),
    }),
    rpc: async () => ({ data: true, error: null }),
  } as never
  await assert.rejects(
    () => loadProjectDefinition(readErrorClient, projectId),
    (error: unknown) =>
      error instanceof Error && error.message === "project read failed",
  )

  const capabilityErrorClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: projectRow, error: null }),
        }),
      }),
    }),
    rpc: async () => ({
      data: null,
      error: { message: "capability lookup failed" },
    }),
  } as never
  await assert.rejects(
    () => loadProjectDefinition(capabilityErrorClient, projectId),
    (error: unknown) =>
      error instanceof Error && error.message === "capability lookup failed",
  )

  const saveErrorClient = {
    from: () => ({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({
              data: null,
              error: { message: "project save failed" },
            }),
          }),
        }),
      }),
    }),
  } as never
  await assert.rejects(
    () =>
      saveProjectDefinition(saveErrorClient, projectId, {
        activityCode: "PQ-001",
        projectTitle: "PipeQC Project",
        owner: "Owner Company",
        contractor: "EPC Contractor",
        ownerLogoUrl: "",
        contractorLogoUrl: "",
        maxTransitTimeDays: 14,
      }),
    (error: unknown) =>
      error instanceof Error && error.message === "project save failed",
  )
}

void run()
