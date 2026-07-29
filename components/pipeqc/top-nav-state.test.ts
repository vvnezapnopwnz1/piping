import assert from "node:assert/strict"

import { getTopNavDisplay } from "./top-nav-state"

assert.deepEqual(
  getTopNavDisplay("demo", {
    membership: {
      activityCode: "REAL-001",
      title: "Real project",
    },
    email: "person@example.com",
    roleLabel: "QC Engineer",
  }),
  { kind: "demo" }
)

assert.deepEqual(
  getTopNavDisplay("supabase", {
    membership: {
      activityCode: "REAL-001",
      title: "Real project",
    },
    email: "person@example.com",
    roleLabel: "QC Engineer",
  }),
  {
    kind: "supabase",
    project: {
      activityCode: "REAL-001",
      title: "Real project",
    },
    email: "person@example.com",
    roleLabel: "QC Engineer",
  }
)
