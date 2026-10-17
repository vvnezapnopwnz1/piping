import assert from "node:assert/strict"
import test from "node:test"

import { acceptNdeResults, rejectDraftValid } from "./accept-nde-results"

const fakeClient = (refuse: string[] = []) => {
  const calls: Record<string, unknown>[] = []
  const client = {
    rpc: async (_name: string, args: Record<string, unknown>) => {
      calls.push(args)
      const id = String(args.target_obligation_id)
      if (refuse.includes(id)) return { data: null, error: { message: `refused ${id}`, code: "PQC41" } }
      return { data: { id: `result-${id}`, project_id: "p", obligation_id: id, batch_item_id: null, outcome: "accepted" }, error: null }
    },
  }
  return { client: client as never, calls }
}

test("results are recorded one by one; a refusal does not stop the rest", async () => {
  const { client, calls } = fakeClient(["b"])
  const result = await acceptNdeResults(client, ["a", "b", "c"], "2026-10-17", "R1")
  assert.deepEqual(result.accepted, ["a", "c"])
  assert.equal(result.failed.length, 1)
  assert.equal(result.failed[0].id, "b")
  assert.match(result.failed[0].message, /not in a state that allows that action/)
  assert.equal(calls.length, 3)
})

test("the report number is numbered per joint and the retry key is stable per obligation", async () => {
  const { client, calls } = fakeClient()
  await acceptNdeResults(client, ["a", "b"], "2026-10-17", "R1")
  assert.deepEqual(calls.map((call) => call.report_number), ["R1-1", "R1-2"])
  assert.deepEqual(calls.map((call) => call.idempotency_key), ["nde-accept-a", "nde-accept-b"])
})

test("no joints means no call; an empty report number is sent as none", async () => {
  const empty = fakeClient()
  assert.deepEqual(await acceptNdeResults(empty.client, [], "2026-10-17", "R1"), { accepted: [], failed: [] })
  assert.equal(empty.calls.length, 0)
  const blank = fakeClient()
  await acceptNdeResults(blank.client, ["a"], "2026-10-17", "  ")
  assert.equal(blank.calls[0].report_number, undefined)
})

test("a rejection needs a defect code, and a welder only from this joint", () => {
  assert.equal(rejectDraftValid({ defectCodeId: "", welderId: "" }, []), false)
  assert.equal(rejectDraftValid({ defectCodeId: "c", welderId: "" }, []), true)
  assert.equal(rejectDraftValid({ defectCodeId: "c", welderId: "w9" }, ["w1"]), false)
  assert.equal(rejectDraftValid({ defectCodeId: "c", welderId: "w1" }, ["w1"]), true)
})
