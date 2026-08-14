import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(new URL("./home-executive-overview.tsx", import.meta.url), "utf8")

test("Home executive overview uses live scoped summaries and keeps the detailed module routes", () => {
  for (const expected of [
    "loadHomeFabricationSummary",
    "loadHomeNdeSummary",
    "loadHomeErectionSummary",
    '"fabrication.view"',
    '"nde.view"',
    '"erection.view"',
    'href="/fabrication/dashboard"',
    'href="/nde/dashboard"',
    'href="/erection/dashboard"',
  ]) {
    assert.ok(source.includes(expected), `Home overview must include ${expected}`)
  }

  assert.equal(source.includes("Welds requiring action 1"), false)
  assert.equal(source.includes("NDE batches active 4"), false)
})
