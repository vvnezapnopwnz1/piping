import assert from "node:assert/strict"
import test from "node:test"
import { listFlangeWorklist, recordFlangeProgress } from "./supabase-flange-repository"

test("repository reads the scoped worklist view", async () => {
  const calls: unknown[] = []
  const client = {
    from(name: string) {
      calls.push(["from", name])
      return {
        select: (columns: string) => { calls.push(["select", columns]); return { eq: (field: string, value: string) => { calls.push(["eq", field, value]); return { order: async () => ({ data: [{ flange_joint_revision_id: "fjr-1", progress_state: "not_started" }], error: null }) } } } },
      }
    },
  } as never
  const rows = await listFlangeWorklist(client, "project-1")
  assert.equal(rows[0]?.flangeJointRevisionId, "fjr-1")
  assert.deepEqual(calls[0], ["from", "flange_joint_worklist"])
})

test("repository uses only the command RPC for progress writes", async () => {
  const calls: unknown[] = []
  const client = {
    rpc(name: string, args: Record<string, unknown>) {
      calls.push([name, args])
      return Promise.resolve({ data: { record: { id: "progress-1" } }, error: null })
    },
  } as never
  await recordFlangeProgress(client, {
    projectId: "project-1", flangeJointRevisionId: "revision-1", jointCategoryId: "category-1",
    torquingRequirementId: "method-1", jointingValue: 120, jointDate: "2026-08-04",
    reportNumber: "R-1", tagNumber: "T-1", jointerIds: ["j-1"], idempotencyKey: "action-1",
  })
  const rpcCall = calls[0] as [string, Record<string, unknown>]
  assert.equal(rpcCall[0], "record_flange_progress")
  assert.equal(rpcCall[1].target_project_id, "project-1")
})
