import assert from "node:assert/strict"
import test from "node:test"

import { jointState, jointStatusMessage, ndeTab } from "./nde-joint-state"

const ob = (disposition: string, batchNumber: string | null) => ({ disposition, batchNumber }) as never

test("a pending obligation without a batch waits for a batch", () => {
  assert.equal(jointState(ob("pending", null)), "waiting_batch")
})
test("a pending obligation that already has a batch is in the batch", () => {
  assert.equal(jointState(ob("pending", "NB-1")), "in_batch")
})
test("an issued obligation waits for its result; a satisfied one is done", () => {
  assert.equal(jointState(ob("issued", "NB-1")), "waiting_result")
  assert.equal(jointState(ob("satisfied", "NB-1")), "done")
})
test("the tab comes from the address and falls back to the joints table", () => {
  assert.equal(ndeTab("summary"), "summary")
  assert.equal(ndeTab("waiting_result"), "waiting_result")
  assert.equal(ndeTab("zzz"), "joints")
  assert.equal(ndeTab(null), "joints")
})

test("the manual's joint status code becomes a message key, with the cycle number where it has one", () => {
  const base = { disposition: "pending", cycleKind: "original", cycleOrdinal: 0, coverageRegime: "spot", batchNumber: null }
  assert.deepEqual(jointStatusMessage({ ...base } as never), { key: "jointStatus.S" })
  assert.deepEqual(jointStatusMessage({ ...base, disposition: "satisfied" } as never), { key: "jointStatus.NR" })
  assert.deepEqual(jointStatusMessage({ ...base, cycleKind: "tracer", cycleOrdinal: 2, disposition: "issued" } as never), { key: "jointStatus.tracerSelected", values: { n: "2" } })
  assert.deepEqual(jointStatusMessage({ ...base, cycleKind: "repair", cycleOrdinal: 1 } as never), { key: "jointStatus.repair", values: { n: "1" } })
})
