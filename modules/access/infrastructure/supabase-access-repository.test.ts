import assert from "node:assert/strict"

import {
  AccessContractError,
  AccessLoadError,
  listCurrentUserProjects,
} from "./supabase-access-repository"

const calls: Array<{ fn: string; args: Record<string, never> }> = []

const platformAdminClient = {
  rpc(fn: string, args: Record<string, never> = {}) {
    calls.push({ fn, args })
    return Promise.resolve({
      data: [
        {
          membership_id: null,
          project_id: "project-a",
          activity_code: "PQ-001",
          title: "Alpha",
          project_status: "active",
          access_role_code: null,
          functional_role_codes: null,
          capability_codes: null,
          subcontractor_ids: null,
          pds_area_ids: null,
          is_platform_admin: true,
        },
      ],
      error: null,
    })
  },
}

async function run() {
assert.deepEqual(await listCurrentUserProjects(platformAdminClient as never), [
  {
    membershipId: null,
    projectId: "project-a",
    activityCode: "PQ-001",
    title: "Alpha",
    projectStatus: "active",
    accessRole: null,
    functionalRoles: [],
    capabilities: [],
    subcontractorIds: [],
    pdsAreaIds: [],
    isPlatformAdmin: true,
  },
])
assert.deepEqual(calls[0], {
  fn: "list_current_user_projects",
  args: {},
})

await assert.rejects(
  () =>
    listCurrentUserProjects({
      rpc: () =>
        Promise.resolve({
          data: [
            {
              membership_id: "membership-a",
              project_id: "project-a",
              activity_code: "PQ-001",
              title: "Alpha",
              project_status: "active",
              access_role_code: "unknown_role",
              functional_role_codes: [],
              capability_codes: [],
              subcontractor_ids: [],
              pds_area_ids: [],
              is_platform_admin: false,
            },
          ],
          error: null,
        }),
    } as never),
  AccessContractError,
)

await assert.rejects(
  () =>
    listCurrentUserProjects({
      rpc: () => Promise.resolve({ data: null, error: new Error("denied") }),
    } as never),
  AccessLoadError,
)
}

void run()
