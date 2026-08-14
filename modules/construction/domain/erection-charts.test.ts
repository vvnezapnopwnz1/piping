import assert from "node:assert/strict"

import { toErectionBlockerSeries, toErectionCurveSeries, toErectionStageSeries } from "./erection-charts"

assert.deepEqual(
  toErectionCurveSeries([{ week_start: "2026-08-03", to_site_count: 5, erected_count: 4, welded_bolted_count: 3, supported_count: 2, rft_count: 1 }]),
  [{ weekStart: "2026-08-03", label: "Aug 3", toSite: 5, erected: 4, weldedBolted: 3, supported: 2, rft: 1 }],
)
assert.deepEqual(
  toErectionStageSeries([{ stage: "rft", stage_order: 5, spool_count: 2 }, { stage: "not_started", stage_order: 0, spool_count: 1 }]),
  [{ stage: "not_started", label: "Not started", count: 1 }, { stage: "rft", label: "Ready for Test", count: 2 }],
)
assert.deepEqual(
  toErectionBlockerSeries([{ blocker: "nde", blocker_order: 2, spool_count: 3 }, { blocker: "supported", blocker_order: 1, spool_count: 2 }]),
  [{ blocker: "supported", label: "Support not recorded", count: 2 }, { blocker: "nde", label: "Open NDE", count: 3 }],
)
