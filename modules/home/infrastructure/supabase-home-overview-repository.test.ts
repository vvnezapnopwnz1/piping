import assert from "node:assert/strict"
import test from "node:test"

import {
  loadHomeErectionSummary,
  loadHomeFabricationSummary,
  loadHomeNdeSummary,
} from "./supabase-home-overview-repository"

test("Home summaries read only their matching scoped aggregate RPC", async () => {
  const calls: unknown[] = []
  const client = {
    rpc(name: string, args: Record<string, unknown>) {
      calls.push([name, args])
      return Promise.resolve({ data: [], error: null })
    },
  } as never

  await Promise.all([
    loadHomeFabricationSummary(client, "project-1"),
    loadHomeNdeSummary(client, "project-1"),
    loadHomeErectionSummary(client, "project-1"),
  ])

  assert.deepEqual(calls, [
    ["fabrication_spool_stage_counts", { target_project_id: "project-1" }],
    ["nde_inspection_workflow_distribution", { target_project_id: "project-1" }],
    ["erection_stage_distribution", { target_project_id: "project-1" }],
  ])
})
