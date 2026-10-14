import assert from "node:assert/strict"

import { getVisibleNavigation, workspaceAreas } from "./navigation"

const visibleItems = getVisibleNavigation(() => true)
  .flatMap((section) => section.items)

assert.equal(
  visibleItems.some((item) => item.href === "/reports"),
  true,
  "the implemented Reports route must appear for a user with reports.view",
)

const noReportsItems = getVisibleNavigation((capability) => capability !== "reports.view")
  .flatMap((section) => section.items)

assert.equal(
  noReportsItems.some((item) => item.href === "/reports"),
  false,
  "Reports remains hidden when the user lacks reports.view",
)

// The stage rail opens an area and the module tabs list its pages, so a page is reachable from
// navigation only when it is a page of some area. Every built page the old sidebar offered has
// to stay one.
const pageHrefs = workspaceAreas.flatMap((area) =>
  area.children.flatMap((page) => [page.href, ...(page.aliases ?? []).map((alias) => alias.href)]),
)

for (const href of [
  "/admin",
  "/admin/project-definition",
  "/admin/system-referential",
  "/admin/project-referential",
  "/admin/access-rights",
  "/admin/imports",
  "/admin/progress-weights",
  "/spooling/browse",
  "/spooling/import",
  "/spooling/revisions",
  "/fabrication/dashboard",
  "/fabrication/material-check",
  "/fabrication/qc-release",
  "/fabrication/pwht-release",
  "/fabrication/paint",
  "/fabrication/laydown",
  "/fabrication/weld-progress",
  "/erection/dashboard",
  "/erection/to-site",
  "/erection/material-check",
  "/erection/erected",
  "/erection/welded-bolted",
  "/erection/supported",
  "/erection/field-qc-release",
  "/erection/rft",
  "/erection/weld-progress",
  "/erection/flange-progress",
  "/tracking",
  "/tracking/data-analysis",
  "/tracking/print-barcodes",
  "/tracking/devices",
  "/nde",
  "/nde/dashboard",
  "/testpack",
  "/testpack/builder",
  "/testpack/explorer",
  "/testpack/pressure-test",
  "/flange",
  "/reports",
]) {
  assert.equal(pageHrefs.includes(href), true, `${href} must stay reachable from module navigation`)
}

// An alias is the same screen under another address. It must never also be a tab of its own.
const tabHrefs = new Set(workspaceAreas.flatMap((area) => area.children.map((page) => page.href)))
for (const area of workspaceAreas) {
  for (const page of area.children) {
    for (const alias of page.aliases ?? []) {
      assert.equal(tabHrefs.has(alias.href), false, `${alias.href} is both an alias and a tab`)
    }
  }
}

assert.equal(
  new Set(workspaceAreas.map((area) => area.id)).size,
  workspaceAreas.length,
  "area ids are the shared key of the map, the rail and the tabs, so they must be unique",
)

assert.deepEqual(
  workspaceAreas.filter((area) => area.kind === "stage").map((area) => area.step),
  ["01", "02", "03", "04"],
  "process stages are numbered in the order they are drawn",
)

// A shared service is drawn beside the stages it serves; it must name real stages.
const stageIds = new Set(workspaceAreas.filter((area) => area.kind === "stage").map((area) => area.id))
for (const service of workspaceAreas.filter((area) => area.kind === "service")) {
  for (const id of service.serves ?? []) {
    assert.equal(stageIds.has(id), true, `${service.id} serves an unknown stage ${id}`)
  }
}

const erectionArea = workspaceAreas.find((area) => area.id === "erection")
assert.deepEqual(
  erectionArea?.children.map((page) => page.title),
  ["spools", "dashboard", "flangeProgress"],
  "Erection module tabs are Spools, Dashboard and Flange Progress",
)

