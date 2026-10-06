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

test("the test pack summary counts packs and their Ready for Test flag in the open project", async () => {
  const calls: unknown[] = []
  const client = {
    from(table: string) {
      return {
        select(columns: string) {
          return {
            eq(column: string, value: string) {
              calls.push([table, columns, column, value])
              return Promise.resolve({
                data: [{ test_pack_id: "a", is_rft: true }, { test_pack_id: "b", is_rft: false }, { test_pack_id: "c", is_rft: null }],
                error: null,
              })
            },
          }
        },
      }
    },
  } as never

  const { loadHomeTestPackSummary } = await import("./supabase-home-overview-repository")
  assert.deepEqual(await loadHomeTestPackSummary(client, "project-1"), { total: 3, readyForTest: 1, blocked: 2 })
  assert.deepEqual(calls, [["test_pack_readiness", "test_pack_id, is_rft", "project_id", "project-1"]])
})
