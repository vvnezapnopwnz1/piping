import assert from "node:assert/strict"
import test from "node:test"
import {
  canVisit,
  firstAccessibleDestination,
  getPageDestinations,
  getPageHierarchy,
  getWorkbenchHierarchy,
  getRelatedWork,
  scorePageQuery,
} from "./navigation-model"
import { getVisibleNavigation } from "@/config/navigation"

test("page finder deduplicates destinations and excludes unbuilt pages", () => {
  const pages = getPageDestinations(() => true)
  assert.equal(new Set(pages.map((page) => page.href)).size, pages.length)
  assert.ok(pages.some((page) => page.href === "/testpack/pressure-test"))
  assert.ok(!pages.some((page) => page.href.includes("transmittal")))
})

test("page search matches words in any order without unrelated fuzzy results", () => {
  assert.equal(scorePageQuery("Field Material Check Erection", "Line Check"), 0)
  assert.ok(
    scorePageQuery(
      "Progress Testpack / Pressure Test / Line Check",
      "line check progress",
    ) > 0,
  )
  assert.ok(scorePageQuery("Line Check Testpack", "line-check") > 0)
  assert.equal(scorePageQuery("Line Check Testpack", "Line Check"), 1)
})

test("a permitted child does not make its denied parent a search destination", () => {
  const can = (capability: string) => capability === "fabrication.qc.release"
  const pages = getPageDestinations(can)
  assert.ok(pages.some((page) => page.href === "/fabrication/qc-release"))
  assert.ok(!pages.some((page) => page.href === "/fabrication"))
  assert.equal(canVisit("/fabrication", can), false)
  const fabrication = getVisibleNavigation(can)
    .flatMap((section) => section.items)
    .find((item) => item.href === "/fabrication")!
  assert.equal(
    firstAccessibleDestination(fabrication, can),
    "/fabrication/qc-release",
  )
  assert.deepEqual(getRelatedWork("/erection/rft", can), [])
})

test("breadcrumbs follow navigation hierarchy rather than guessed URL segments", () => {
  const hierarchy = getPageHierarchy("/fabrication/qc-release", () => true)
  assert.deepEqual(
    hierarchy.map((page) => page.href),
    ["/fabrication", "/fabrication/qc-release"],
  )
  assert.equal(hierarchy.at(-1)?.title, "QC Release")
  assert.equal(getPageHierarchy("/testpack", () => true).length, 1)
  assert.deepEqual(
    getPageHierarchy(
      "/testpack/pressure-test/line-check/progress",
      () => true,
    ).map((page) => page.title),
    ["Test Packs", "Pressure Test", "Line Check", "Progress"],
  )
  assert.ok(
    getPageDestinations(() => true).some(
      (page) =>
        page.href === "/testpack/pressure-test/line-check/progress" &&
        page.context.includes("Line Check"),
    ),
  )
})

test("related work is permission filtered and dynamic identifiers are not labels", () => {
  assert.deepEqual(
    getRelatedWork(
      "/fabrication/dashboard",
      (capability) => capability === "nde.view",
    ).map((page) => page.href),
    ["/nde"],
  )
  const hierarchy = getPageHierarchy(
    "/testpack/explorer/10000000-0000-0000-0000-000000000001",
    () => true,
  )
  assert.equal(hierarchy.at(-1)?.title, "Record details")
})

test("the project overview and its modules retain a route back to all projects", () => {
  assert.deepEqual(
    getWorkbenchHierarchy("/", () => true).map((page) => page.href),
    ["/projects", "/"],
  )
  assert.deepEqual(
    getWorkbenchHierarchy("/fabrication/dashboard", () => true).map(
      (page) => page.href,
    ),
    ["/projects", "/", "/fabrication", "/fabrication/dashboard"],
  )
})
