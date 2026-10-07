import assert from "node:assert/strict"

import {
  hasFabricationChartData,
  toFabricationCurveSeries,
  toPdsAreaProgressSeries,
  toStageDistributionSeries,
} from "./fabrication-charts"

const week = (isoDate: string) => `week ${isoDate}`
const label = (code: string) => `label ${code}`

const curve = toFabricationCurveSeries([
  {
    week_start: "2026-08-03",
    start_fab_count: 3,
    material_check_count: 2,
    fabricated_count: 2,
    qc_release_count: 1,
    sent_to_paint_count: 1,
    painted_count: 0,
    final_qc_count: 0,
    laydown_count: 0,
  },
], week)

assert.deepEqual(curve, [{
  weekStart: "2026-08-03",
  label: "week 2026-08-03",
  startFab: 3,
  materialCheck: 2,
  fabricated: 2,
  qcRelease: 1,
  sentToPaint: 1,
  painted: 0,
  finalQc: 0,
  laydown: 0,
}])

assert.deepEqual(
  toStageDistributionSeries([
    { stage: "painted", stage_order: 6, spool_count: 3 },
    { stage: "not_started", stage_order: 0, spool_count: 1 },
  ], label),
  [
    { stage: "not_started", label: "label not_started", count: 1 },
    { stage: "painted", label: "label painted", count: 3 },
  ],
)

assert.deepEqual(
  toPdsAreaProgressSeries([
    { pds_area_code: "PDS-200", complete_count: 1, in_progress_count: 2, not_started_count: 0 },
  ]),
  [{ area: "PDS-200", complete: 1, inProgress: 2, notStarted: 0 }],
)

assert.equal(hasFabricationChartData(curve), true)
assert.equal(hasFabricationChartData([]), false)
