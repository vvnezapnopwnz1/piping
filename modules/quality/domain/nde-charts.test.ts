import assert from "node:assert/strict"

import {
  toNdeMethodSeries,
  toNdeOutcomeTrendSeries,
  toNdeWorkflowSeries,
} from "./nde-charts"

const week = (isoDate: string) => `week ${isoDate}`
const label = (code: string) => `label ${code}`

assert.deepEqual(
  toNdeOutcomeTrendSeries([
    { week_start: "2026-08-03", accepted_count: 6, rejected_count: 1 },
  ], week),
  [{ weekStart: "2026-08-03", label: "week 2026-08-03", accepted: 6, rejected: 1 }],
)

assert.deepEqual(
  toNdeWorkflowSeries([
    { status: "allocated", status_order: 1, obligation_count: 2 },
    { status: "result_recorded", status_order: 3, obligation_count: 6 },
    { status: "pending", status_order: 0, obligation_count: 4 },
  ], label),
  [
    { status: "pending", label: "label pending", count: 4 },
    { status: "allocated", label: "label allocated", count: 2 },
    { status: "result_recorded", label: "label result_recorded", count: 6 },
  ],
)

assert.deepEqual(
  toNdeMethodSeries([
    { method: "pt", pending_count: 1, allocated_count: 0, issued_count: 2, accepted_count: 3, rejected_count: 0 },
    { method: "rt", pending_count: 0, allocated_count: 3, issued_count: 1, accepted_count: 7, rejected_count: 1 },
  ], label),
  [
    { method: "label rt", pending: 0, allocated: 3, issued: 1, accepted: 7, rejected: 1 },
    { method: "label pt", pending: 1, allocated: 0, issued: 2, accepted: 3, rejected: 0 },
  ],
)
