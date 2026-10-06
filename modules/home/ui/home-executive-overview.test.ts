import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getVisibleAreas } from "@/components/pipeqc/workspace-model"

const source = readFileSync(new URL("./home-executive-overview.tsx", import.meta.url), "utf8")

test("Home overview uses live scoped summaries and opens modules through the shared registry", () => {
  for (const expected of [
    "loadHomeFabricationSummary",
    "loadHomeNdeSummary",
    "loadHomeErectionSummary",
    "loadHomeTestPackSummary",
    '"fabrication.view"',
    '"nde.view"',
    '"erection.view"',
    '"testpack.view"',
    "getVisibleAreas",
    "areaHrefWithContext",
  ]) {
    assert.ok(source.includes(expected), `Home overview must include ${expected}`)
  }

  assert.equal(source.includes("Welds requiring action 1"), false)
  assert.equal(source.includes("NDE batches active 4"), false)
})

test("the map's stage cards open each module where its work is done", () => {
  const homes = Object.fromEntries(getVisibleAreas(() => true).map((area) => [area.id, area.home]))
  // Fabrication and Erection open on their spool workbench; dashboards are the next tabs.
  assert.equal(homes.fabrication, "/fabrication")
  assert.equal(homes.erection, "/erection")
  assert.equal(homes.testpacks, "/testpack")
  assert.equal(homes.nde, "/nde")
})
