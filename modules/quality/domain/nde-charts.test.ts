import assert from "node:assert/strict"

import {
  toNdeMethodSeries,
  toNdeOutcomeTrendSeries,
  toNdeWorkflowSeries,
} from "./nde-charts"

assert.deepEqual(
  toNdeOutcomeTrendSeries([
    { week_start: "2026-08-03", accepted_count: 6, rejected_count: 1 },
  ]),
  [{ weekStart: "2026-08-03", label: "Aug 3", accepted: 6, rejected: 1 }],
)

assert.deepEqual(
  toNdeWorkflowSeries([
    { status: "allocated", status_order: 1, obligation_count: 2 },
    { status: "result_recorded", status_order: 3, obligation_count: 6 },
    { status: "pending", status_order: 0, obligation_count: 4 },
  ]),
  [
    { status: "pending", label: "Pending allocation", count: 4 },
    { status: "allocated", label: "Allocated", count: 2 },
    { status: "result_recorded", label: "Inspected", count: 6 },
  ],
)

assert.deepEqual(
  toNdeMethodSeries([
    { method: "pt", pending_count: 1, allocated_count: 0, issued_count: 2, accepted_count: 3, rejected_count: 0 },
    { method: "rt", pending_count: 0, allocated_count: 3, issued_count: 1, accepted_count: 7, rejected_count: 1 },
  ]),
  [
    { method: "RT", pending: 0, allocated: 3, issued: 1, accepted: 7, rejected: 1 },
    { method: "PT", pending: 1, allocated: 0, issued: 2, accepted: 3, rejected: 0 },
  ],
)
