import assert from "node:assert/strict"

import {
  deriveSupabaseAccessState,
  synchronizeProjectAccessDisplay,
  resolveActiveProjectAccess,
  sortProjectAccessesForDisplay,
  activeProjectStorageKey,
} from "./supabase-auth-state"

assert.equal(deriveSupabaseAccessState(null, null), "unauthenticated")
assert.equal(deriveSupabaseAccessState({ id: "user" }, null), "no_membership")
assert.equal(
  deriveSupabaseAccessState(
    { id: "user" },
    { projectId: "project" }
  ),
  "authorized"
)

const access = {
  membershipId: "membership",
  projectId: "project",
  activityCode: "PQ-001",
  title: "Old title",
  accessRole: "project_reader" as const,
  functionalRoles: ["qc_engineer"] as const,
  capabilities: ["project.view"] as const,
}

assert.deepEqual(
  synchronizeProjectAccessDisplay(access, "project", {
    activityCode: "PQ-002",
    title: "New title",
  }),
  {
    ...access,
    activityCode: "PQ-002",
    title: "New title",
  },
)
assert.equal(
  synchronizeProjectAccessDisplay(access, "other-project", {
    activityCode: "PQ-002",
    title: "New title",
  }),
  access,
)

const accesses = [
  {
    membershipId: "membership-b",
    projectId: "project-b",
    activityCode: "PQ-020",
    title: "Beta Project",
    accessRole: "project_reader" as const,
    functionalRoles: ["qc_engineer"] as const,
    capabilities: ["project.view"] as const,
  },
  {
    membershipId: "membership-a",
    projectId: "project-a",
    activityCode: "PQ-010",
    title: "Alpha Project",
    accessRole: "project_reader" as const,
    functionalRoles: ["project_manager"] as const,
    capabilities: ["project.view"] as const,
  },
]

assert.equal(resolveActiveProjectAccess(accesses, "project-b")?.projectId, "project-b")
assert.equal(resolveActiveProjectAccess(accesses, "missing-project")?.projectId, "project-a")
assert.equal(resolveActiveProjectAccess(accesses, null)?.projectId, "project-a")
assert.equal(resolveActiveProjectAccess([], "project-a"), null)
assert.equal(activeProjectStorageKey("user-1"), "pipeqc.active-project:user-1")

const platformAdminAccess = {
  membershipId: null,
  projectId: "project-admin",
  activityCode: "PQ-000",
  title: "Platform project",
  accessRole: null,
  functionalRoles: [],
  capabilities: [],
  isPlatformAdmin: true,
}
assert.equal(
  deriveSupabaseAccessState({ id: "admin" }, platformAdminAccess),
  "authorized",
)

const sorted = sortProjectAccessesForDisplay(accesses)
assert.deepEqual(
  sorted.map((m) => m.projectId),
  ["project-a", "project-b"]
)
assert.equal(accesses[0].projectId, "project-b")
