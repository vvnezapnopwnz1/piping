import assert from "node:assert/strict"
import test from "node:test"

import {
  areaHrefWithContext,
  getVisibleAreas,
  groupTabs,
  hrefWithContext,
  linkFrom,
  locate,
  readWorkContext,
  returnLabel,
  safeReturnPath,
} from "./workspace-model"
import type { NavKey } from "@/config/navigation"
import { en } from "@/i18n/messages"

const name = (key: NavKey) => en.nav[key]

const all = getVisibleAreas(() => true)

test("an area appears only with pages the user may open, and opens on the first of them", () => {
  const areas = getVisibleAreas((capability) => capability === "fabrication.qc.release")
  assert.deepEqual(areas.map((area) => area.id), ["fabrication"])
  assert.deepEqual(
    areas[0].pages.map((page) => page.href),
    ["/fabrication/qc-release"],
  )
  assert.equal(areas[0].home, "/fabrication/qc-release")
})

test("planned pages never become tabs", () => {
  const spooling = all.find((area) => area.id === "spooling")!
  assert.ok(!spooling.pages.some((page) => page.href.includes("transmittal")))
})

test("a path belongs to its longest matching page", () => {
  assert.equal(locate("/testpack/explorer", all)?.page?.title, "explorer")
  assert.equal(locate("/testpack", all)?.page?.title, "dashboard")
  assert.equal(locate("/testpack/pressure-test/line-check/progress", all)?.page?.title, "pressureTest")
  assert.equal(locate("/nde/dashboard", all)?.page?.title, "dashboard")
  assert.equal(locate("/erection/rft", all)?.area.id, "erection")
  // Routes that render the same screen as a step are that step, not a page of their own.
  assert.equal(locate("/fabrication/pwht-release", all)?.page?.title, "spools")
  assert.equal(locate("/fabrication/material-check", all)?.page?.title, "spools")
  assert.equal(locate("/fabrication", all)?.page?.title, "spools")
  assert.equal(locate("/fabrication/dashboard", all)?.page?.title, "dashboard")

  // A redirecting index route still belongs to its area.
  const index = locate("/spooling", all)
  assert.equal(index?.area.id, "spooling")
  assert.equal(index?.page, null)
  assert.equal(locate("/", all), null)
  assert.equal(locate("/projects", all), null)
})

test("the selected object travels only to pages that apply it", () => {
  const context = readWorkContext(new URLSearchParams("spool=rev-1&testPackId=tp-9"))
  const erection = all.find((area) => area.id === "erection")!
  const spools = erection.pages.find((page) => page.href === "/erection")!
  const flanges = erection.pages.find((page) => page.href === "/erection/flange-progress")!
  assert.equal(hrefWithContext(spools, context), "/erection?spool=rev-1")
  assert.equal(hrefWithContext(flanges, context), "/erection/flange-progress")
  const testPacks = all.find((area) => area.id === "testpacks")!
  const explorer = testPacks.pages.find((page) => page.href === "/testpack/explorer")!
  assert.equal(hrefWithContext(explorer, context), "/testpack/explorer?testPackId=tp-9")
  assert.equal(areaHrefWithContext(testPacks, context), "/testpack")
  const nde = all.find((area) => area.id === "nde")!
  assert.equal(areaHrefWithContext(nde, context), "/nde?spool=rev-1")
})

test("a return address must stay inside the app", () => {
  assert.equal(safeReturnPath("/erection/rft?spool=1"), "/erection/rft?spool=1")
  assert.equal(safeReturnPath("//evil.example/x"), null)
  assert.equal(safeReturnPath("https://evil.example"), null)
  assert.equal(safeReturnPath("/\\evil.example"), null)
  assert.equal(safeReturnPath(null), null)
  assert.equal(linkFrom("/nde?spool=1", "/erection/rft?spool=1"), "/nde?spool=1&from=%2Ferection%2Frft%3Fspool%3D1")
})

test("Back names the page it returns to", () => {
  assert.equal(returnLabel("/erection/dashboard", all, name), "Erection · Dashboard")
  assert.equal(returnLabel("/testpack/explorer?testPackId=1", all, name), "Test Packs · Explorer")
  assert.equal(returnLabel("/reports", all, name), "Reports")
  assert.equal(returnLabel("/", all, name), "Overview")
})

test("module tabs keep registry order and group labels", () => {
  const erection = all.find((area) => area.id === "erection")!
  assert.deepEqual(
    groupTabs(erection.pages).map((group) => [group.label, group.pages.length]),
    [[null, 3]],
  )
})

test("fabrication is one spool workbench, not a tab per shop stage", () => {
  const fabrication = all.find((area) => area.id === "fabrication")!
  assert.deepEqual(
    fabrication.pages.map((page) => [page.title, page.href]),
    [
      ["spools", "/fabrication"],
      ["dashboard", "/fabrication/dashboard"],
    ],
  )
  // Every operation address still opens, as the workbench on that operation.
  assert.deepEqual(
    fabrication.pages[0].aliases?.map((alias) => alias.href),
    [
      "/fabrication/material-check",
      "/fabrication/weld-progress",
      "/fabrication/qc-release",
      "/fabrication/pwht-release",
      "/fabrication/paint",
      "/fabrication/laydown",
    ],
  )
})

test("erection is a field-spool workbench beside the readiness list, not a tab per step", () => {
  const erection = all.find((area) => area.id === "erection")!
  assert.deepEqual(
    erection.pages.map((page) => page.title),
    ["spools", "dashboard", "flangeProgress"],
  )
  assert.equal(locate("/erection/supported", all)?.page?.title, "spools")
  assert.equal(locate("/erection/weld-progress", all)?.page?.title, "spools")
  assert.equal(locate("/erection/rft", all)?.page?.title, "spools")
  assert.equal(locate("/erection/field-qc-release", all)?.page?.title, "spools")
})
