import assert from "node:assert/strict"
import test from "node:test"

import { toExecutiveOverview } from "./executive-overview"

test("toExecutiveOverview turns scoped aggregate distributions into Home progress and attention", () => {
  const overview = toExecutiveOverview({
    fabricationStages: [
      { current_stage: "not_started", spool_count: 12 },
      { current_stage: "laydown", spool_count: 4 },
    ],
    ndeWorkflow: [
      { status: "pending", obligation_count: 10 },
      { status: "allocated", obligation_count: 5 },
      { status: "issued", obligation_count: 20 },
      { status: "result_recorded", obligation_count: 62 },
    ],
    erectionStages: [
      { stage: "not_started", spool_count: 12 },
      { stage: "rft", spool_count: 4 },
    ],
  })

  assert.deepEqual(overview, {
    fabrication: { total: 16, completed: 4, percentComplete: 25 },
    nde: { total: 97, inspected: 62, awaitingResult: 35, issued: 20, percentInspected: 64 },
    erection: { total: 16, readyForTest: 4, remaining: 12, percentReadyForTest: 25 },
    attention: [
      { module: "nde", count: 20, label: "NDE obligations issued to inspector" },
      { module: "erection", count: 12, label: "Accepted spools not Ready for Test" },
    ],
  })
})

test("toExecutiveOverview returns zeroes when the permitted project has no operational data", () => {
  assert.deepEqual(toExecutiveOverview({ fabricationStages: [], ndeWorkflow: [], erectionStages: [] }), {
    fabrication: { total: 0, completed: 0, percentComplete: 0 },
    nde: { total: 0, inspected: 0, awaitingResult: 0, issued: 0, percentInspected: 0 },
    erection: { total: 0, readyForTest: 0, remaining: 0, percentReadyForTest: 0 },
    attention: [],
  })
})
