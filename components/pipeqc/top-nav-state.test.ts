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

const alpha = projects[0]

// More than one project access means the header offers a switcher.
assert.deepEqual(
  getTopNavDisplay({
    access: alpha,
    projectAccesses: projects,
    email: "person@example.com",
  }),
  {
    project: alpha,
    projects,
    canSwitchProject: true,
    email: "person@example.com",
    accessLabels: ["Project Reader", "Project Manager"],
  },
)

// A single access shows the project without a switcher.
assert.deepEqual(
  getTopNavDisplay({
    access: alpha,
    projectAccesses: [alpha],
    email: "person@example.com",
  }),
  {
    project: alpha,
    projects: [alpha],
    canSwitchProject: false,
    email: "person@example.com",
    accessLabels: ["Project Reader", "Project Manager"],
  },
)

// Before the access summary arrives the header must still render something honest rather than
// an empty project name.
assert.deepEqual(getTopNavDisplay({ access: null, projectAccesses: [], email: undefined }), {
  project: {
    projectId: "loading",
    activityCode: "Project",
    title: "Loading project…",
    accessLabels: [],
  },
  projects: [],
  canSwitchProject: false,
  email: "Authenticated user",
  accessLabels: [],
})
