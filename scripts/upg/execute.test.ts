import assert from "node:assert/strict"
import test from "node:test"

import { EXPECTED_REFUSALS, actionKey, summarizeRun, type ActionResult } from "./execute"
import { buildProjectPlan, type UpgAction } from "./weeks"

const plan = buildProjectPlan()
const weld = plan.find((action) => action.kind === "weld")!
const probe = plan.find((action) => action.kind === "field_support_probe")!

test("keys are deterministic, prefixed and unique per action in a week", () => {
  assert.equal(actionKey(1, weld), actionKey(1, weld))
  assert.match(actionKey(1, weld), /^upg-w1-weld-/)
  const keys = plan.filter((action) => action.day < 7).map((action) => actionKey(1, action))
  assert.equal(new Set(keys).size, keys.length)
})

test("a suffix separates the steps inside one action", () => {
  assert.notEqual(actionKey(7, weld, "a"), actionKey(7, weld, "b"))
})

test("summarizeRun separates expected refusals from unexpected ones", () => {
  const results: ActionResult[] = [
    { action: weld, outcome: "done" },
    { action: probe, outcome: "refused", code: "23505", message: "duplicate", expected: true },
    { action: { ...weld, day: 3 } as UpgAction, outcome: "refused", code: "PQC53", message: "order" },
    { action: weld, outcome: "skipped", message: "manual" },
  ]
  const summary = summarizeRun(results)
  assert.equal(summary.done, 1)
  assert.equal(summary.skipped, 1)
  assert.equal(summary.refused, 2)
  assert.equal(summary.unexpected.length, 1)
  assert.equal(summary.unexpected[0].code, "PQC53")
})

test("the field support probe is the expected refusal and names its finding", () => {
  assert.match(EXPECTED_REFUSALS.field_support_probe ?? "", /L3/)
})
