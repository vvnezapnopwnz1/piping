import assert from "node:assert/strict"

import {
  AccessConfigurationError,
  AccessDeniedError,
  AccessMutationError,
  addProjectMember,
  loadProjectAccessMatrix,
  setProjectMemberActive,
  updateProjectMember,
} from "./supabase-access-rights-repository"

const input = {
  accessRole: "subcontractor" as const,
  functionalRoles: ["nde_inspector" as const],
  subcontractorIds: ["sub-a"],
  pdsAreaIds: ["pds-a"],
}

const calls: Array<[string, unknown]> = []
const client = {
  rpc(name: string, args: unknown) {
    calls.push([name, args])
    return Promise.resolve({
      data:
        name === "get_project_access_matrix"
          ? [
              {
                membership_id: "membership-a",
                user_id: "user-a",
                full_name: "Person A",
                email: "person@example.com",
                is_active: true,
                access_role_code: "subcontractor",
                functional_role_codes: ["nde_inspector"],
                subcontractor_ids: ["sub-a"],
                pds_area_ids: ["pds-a"],
              },
            ]
          : [],
      error: null,
    })
  },
}

async function run() {
  assert.deepEqual(await loadProjectAccessMatrix(client as never, "project-a"), [
    {
      membershipId: "membership-a",
      userId: "user-a",
      fullName: "Person A",
      email: "person@example.com",
      isActive: true,
      ...input,
    },
  ])
  assert.deepEqual(calls[0], [
    "get_project_access_matrix",
    { target_project_id: "project-a" },
  ])

  await addProjectMember(client as never, "project-a", " Person@Example.COM ", input)
  await updateProjectMember(client as never, "membership-a", input)
  await setProjectMemberActive(client as never, "membership-a", false)

  assert.deepEqual(calls.slice(1), [
    [
      "add_project_member_by_email",
      {
        target_project_id: "project-a",
        target_email: "person@example.com",
        requested_access_role: "subcontractor",
        requested_functional_roles: ["nde_inspector"],
        requested_subcontractor_ids: ["sub-a"],
        requested_pds_area_ids: ["pds-a"],
      },
    ],
    [
      "update_project_member_access",
      {
        target_membership_id: "membership-a",
        requested_access_role: "subcontractor",
        requested_functional_roles: ["nde_inspector"],
        requested_subcontractor_ids: ["sub-a"],
        requested_pds_area_ids: ["pds-a"],
      },
    ],
    [
      "set_project_member_active",
      { target_membership_id: "membership-a", requested_active: false },
    ],
  ])

  for (const [code, ErrorType] of [
    ["42501", AccessDeniedError],
    ["PQC03", AccessConfigurationError],
    ["XX000", AccessMutationError],
  ] as const) {
    await assert.rejects(
      () =>
        loadProjectAccessMatrix(
          {
            rpc: () =>
              Promise.resolve({
                data: null,
                error: { code, message: "raw database message" },
              }),
          } as never,
          "project-a",
        ),
      ErrorType,
    )
  }
}

void run()
