import assert from "node:assert/strict"

import { toErectionBlockerSeries, toErectionCurveSeries, toErectionStageSeries } from "./erection-charts"

const week = (isoDate: string) => `week ${isoDate}`
const label = (code: string) => `label ${code}`

assert.deepEqual(
  toErectionCurveSeries([{ week_start: "2026-08-03", to_site_count: 5, erected_count: 4, welded_bolted_count: 3, supported_count: 2, rft_count: 1 }], week),
  [{ weekStart: "2026-08-03", label: "week 2026-08-03", toSite: 5, erected: 4, weldedBolted: 3, supported: 2, rft: 1 }],
)
assert.deepEqual(
  toErectionStageSeries([{ stage: "rft", stage_order: 5, spool_count: 2 }, { stage: "not_started", stage_order: 0, spool_count: 1 }], label),
  [{ stage: "not_started", label: "label not_started", count: 1 }, { stage: "rft", label: "label rft", count: 2 }],
)
assert.deepEqual(
  toErectionBlockerSeries([{ blocker: "nde", blocker_order: 2, spool_count: 3 }, { blocker: "supported", blocker_order: 1, spool_count: 2 }], label),
  [{ blocker: "supported", label: "label supported", count: 2 }, { blocker: "nde", label: "label nde", count: 3 }],
)
