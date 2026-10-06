import assert from "node:assert/strict"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  ProjectCatalogView,
  type ProjectCatalogViewProps,
} from "./project-catalog-view"

const props: ProjectCatalogViewProps = {
  projects: [
    {
      projectId: "p1",
      activityCode: "REAL-1",
      title: "Real plant",
      projectStatus: "active",
      projectCreatedAt: "2026-10-05T00:00:00Z",
      isPlatformAdmin: false,
      accessRole: "project_reader",
      membershipId: "m1",
      capabilities: ["project.view"],
      functionalRoles: [],
      subcontractorIds: [],
      pdsAreaIds: [],
    },
  ],
  metadata: [
    {
      id: "p1",
      owner_name: "Owner & Sons",
      contractor_name: "EPC Contractor",
      contract_number: "CN-1",
    },
  ],
  detailsState: "ready",
  selectedId: null,
  pendingId: null,
  query: "",
  onQuery() {},
  onOpen() {},
  onRetry() {},
}
const render = (override: Partial<ProjectCatalogViewProps> = {}) =>
  renderToStaticMarkup(
    createElement(ProjectCatalogView, { ...props, ...override }),
  )

test("cards show actual project identity, metadata, role and explicit opening action", () => {
  const html = render()
  assert.ok(html.includes("Real plant"))
  assert.ok(html.includes("Owner &amp; Sons"))
  assert.ok(html.includes("CN-1"))
  assert.ok(html.includes("Project Reader"))
  assert.ok(html.includes('aria-label="Open project REAL-1"'))
})

test("loading and error never replace missing metadata with invented description", () => {
  assert.ok(
    render({ detailsState: "loading", metadata: [] }).includes(
      "Loading project details",
    ),
  )
  const error = render({ detailsState: "error", metadata: [] })
  assert.ok(error.includes("Project details could not be loaded"))
  assert.ok(error.includes("Try again"))
  assert.ok(error.includes('aria-label="Open project REAL-1"'))
})

test("search empty result is distinct from having no accessible projects", () => {
  assert.ok(render({ query: "no-match" }).includes("No matching projects"))
  assert.ok(
    render({ projects: [], metadata: [] }).includes(
      "No active projects available",
    ),
  )
})

test("opening feedback disables repeated selection", () => {
  const html = render({ pendingId: "p1" })
  assert.ok(html.includes("Opening project"))
  assert.ok(html.includes("disabled"))
})

test("the current project offers a return, not a second opening", () => {
  const html = render({ selectedId: "p1" })
  assert.ok(html.includes("Current project"))
  assert.ok(html.includes('aria-label="Return to project REAL-1"'))
  assert.ok(!html.includes('aria-label="Open project REAL-1"'))
  assert.ok(html.includes('data-help="current-project"'))
})
