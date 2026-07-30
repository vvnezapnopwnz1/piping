import assert from "node:assert/strict"

import { getTopNavDisplay } from "./top-nav-state"

const projects = [
  {
    projectId: "project-a",
    activityCode: "PQ-010",
    title: "Alpha",
    accessLabels: ["Project Reader", "Project Manager"],
  },
  {
    projectId: "project-b",
    activityCode: "PQ-020",
    title: "Beta",
    accessLabels: ["Project Reader", "QC Engineer"],
  },
]

assert.deepEqual(
  getTopNavDisplay("demo", {
    access: {
      projectId: "project-a",
      activityCode: "PQ-010",
      title: "Alpha",
      accessLabels: ["Project Reader", "Project Manager"],
    },
    projectAccesses: projects,
    email: "person@example.com",
  }),
  { kind: "demo" }
)

assert.deepEqual(
  getTopNavDisplay("supabase", {
    access: {
      projectId: "project-a",
      activityCode: "PQ-010",
      title: "Alpha",
      accessLabels: ["Project Reader", "Project Manager"],
    },
    projectAccesses: projects,
    email: "person@example.com",
  }),
  {
    kind: "supabase",
    project: {
      projectId: "project-a",
      activityCode: "PQ-010",
      title: "Alpha",
      accessLabels: ["Project Reader", "Project Manager"],
    },
    projects,
    canSwitchProject: true,
    email: "person@example.com",
    accessLabels: ["Project Reader", "Project Manager"],
  }
)

assert.deepEqual(
  getTopNavDisplay("supabase", {
    access: {
      projectId: "project-a",
      activityCode: "PQ-010",
      title: "Alpha",
      accessLabels: ["Project Reader", "Project Manager"],
    },
    projectAccesses: [projects[0]],
    email: "person@example.com",
  }),
  {
    kind: "supabase",
    project: {
      projectId: "project-a",
      activityCode: "PQ-010",
      title: "Alpha",
      accessLabels: ["Project Reader", "Project Manager"],
    },
    projects: [projects[0]],
    canSwitchProject: false,
    email: "person@example.com",
    accessLabels: ["Project Reader", "Project Manager"],
  }
)
