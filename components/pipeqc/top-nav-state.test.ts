import assert from "node:assert/strict"

import { getTopNavDisplay } from "./top-nav-state"

// The words shown before the access summary arrives come from the caller, in its language.
const fallback = { activityCode: "Project", title: "Loading project…", email: "Authenticated user" }

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
    fallback,
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
    fallback,
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
assert.deepEqual(getTopNavDisplay({ access: null, projectAccesses: [], email: undefined, fallback: { activityCode: "Проект", title: "Загрузка проекта…", email: "Пользователь" } }), {
  project: {
    projectId: "loading",
    activityCode: "Проект",
    title: "Загрузка проекта…",
    accessLabels: [],
  },
  projects: [],
  canSwitchProject: false,
  email: "Пользователь",
  accessLabels: [],
})
