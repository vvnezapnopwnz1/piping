import assert from "node:assert/strict"

import {
  deriveSupabaseAccessState,
  synchronizeMembershipProjectDisplay,
} from "./supabase-auth-state"

assert.equal(deriveSupabaseAccessState(null, null), "unauthenticated")
assert.equal(deriveSupabaseAccessState({ id: "user" }, null), "no_membership")
assert.equal(
  deriveSupabaseAccessState(
    { id: "user" },
    { projectId: "project", role: "qc_engineer" }
  ),
  "authorized"
)

const membership = {
  membershipId: "membership",
  projectId: "project",
  activityCode: "PQ-001",
  title: "Old title",
  role: "system_admin" as const,
}

assert.deepEqual(
  synchronizeMembershipProjectDisplay(membership, "project", {
    activityCode: "PQ-002",
    title: "New title",
  }),
  {
    ...membership,
    activityCode: "PQ-002",
    title: "New title",
  },
)
assert.equal(
  synchronizeMembershipProjectDisplay(membership, "other-project", {
    activityCode: "PQ-002",
    title: "New title",
  }),
  membership,
)
