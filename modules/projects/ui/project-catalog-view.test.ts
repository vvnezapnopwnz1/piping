import assert from "node:assert/strict"
import test from "node:test"
import { createElement, type ComponentType } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { NextIntlClientProvider } from "next-intl"
import { messagesFor } from "@/i18n/messages"
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
// The provider's props type lists children as required, which createElement's child arguments do not satisfy.
const Provider = NextIntlClientProvider as unknown as ComponentType<{ locale: string; messages: object; timeZone: string }>
const renderIn = (locale: "en" | "ru", override: Partial<ProjectCatalogViewProps> = {}) =>
  renderToStaticMarkup(
    createElement(
      Provider,
      { locale, messages: messagesFor(locale), timeZone: "UTC" },
      createElement(ProjectCatalogView, { ...props, ...override }),
    ),
  )
const render = (override: Partial<ProjectCatalogViewProps> = {}) => renderIn("en", override)

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

test("the catalog reads in Russian, with the role from its code and file data untouched", () => {
  const html = renderIn("ru", { selectedId: "p1" })
  assert.ok(html.includes("Выберите проект для работы."))
  assert.ok(html.includes("Просмотр проекта"))
  assert.ok(html.includes("Текущий проект"))
  assert.ok(html.includes('aria-label="Вернуться к проекту REAL-1"'))
  assert.ok(html.includes("Owner &amp; Sons") && html.includes("CN-1"))
  assert.ok(!html.includes("Return to"))
  assert.ok(renderIn("ru", { query: "x" }).includes("Нет подходящих проектов"))
  assert.ok(renderIn("ru", { detailsState: "error", metadata: [] }).includes("Повторить"))
  assert.ok(renderIn("ru", { metadata: [{ id: "p1", owner_name: "", contractor_name: "", contract_number: "" }] }).includes("Не указан"))
})

test("a project without a role says so in the open language", () => {
  const noRole = { ...props.projects[0], accessRole: null }
  assert.ok(renderIn("en", { projects: [noRole] }).includes("Project access"))
  assert.ok(renderIn("ru", { projects: [noRole] }).includes("Доступ к проекту"))
})

test("the create button appears only when the caller may create a project, in the open language", () => {
  assert.ok(!render().includes("Create project"))
  assert.ok(render({ onCreate() {} }).includes("Create project"))
  assert.ok(renderIn("ru", { onCreate() {} }).includes("Создать проект"))
})

test("an account with no projects can still create one", () => {
  const html = render({ projects: [], metadata: [], onCreate() {} })
  assert.ok(html.includes("No active projects available"))
  assert.ok(html.includes("Create project"))
})
