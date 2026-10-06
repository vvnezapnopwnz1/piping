import assert from "node:assert/strict"
import test from "node:test"

import { CONSTRUCTION_STAGES } from "../../domain/construction-phase"
import {
  FABRICATION_OPERATIONS,
  nextOperation,
  nextStage,
  operationForPath,
  operationState,
} from "./fabrication-operations"

test("the operations cover every shop stage once, in timeline order", () => {
  assert.deepEqual(
    FABRICATION_OPERATIONS.flatMap((operation) => operation.stages),
    [...CONSTRUCTION_STAGES],
  )
})

test("every existing fabrication route opens the workbench on its operation", () => {
  assert.equal(operationForPath("/fabrication/material-check"), "material")
  assert.equal(operationForPath("/fabrication/weld-progress"), "welds")
  assert.equal(operationForPath("/fabrication/qc-release"), "release")
  assert.equal(operationForPath("/fabrication/pwht-release"), "release")
  assert.equal(operationForPath("/fabrication/paint"), "paint")
  assert.equal(operationForPath("/fabrication/laydown"), "laydown")
  assert.equal(operationForPath("/fabrication"), null)
  // The drawer switches steps on the page it is on, so the list is not reloaded.
  assert.equal(operationForPath("/fabrication", "paint"), "paint")
  assert.equal(operationForPath("/fabrication/material-check", "welds"), "welds")
  assert.equal(operationForPath("/fabrication", "nonsense"), null)
})

test("the next operation is the one that records the first stage without a date", () => {
  assert.equal(nextStage({}), "start_fab")
  assert.equal(nextOperation({}), "material")
  const welding = { start_fab: "2026-07-03", material_check: "2026-07-05" }
  assert.equal(nextOperation(welding), "welds")
  assert.equal(operationState(FABRICATION_OPERATIONS[0], welding), "done")
  assert.equal(operationState(FABRICATION_OPERATIONS[1], welding), "next")
  assert.equal(operationState(FABRICATION_OPERATIONS[2], welding), "later")
  const all = Object.fromEntries(CONSTRUCTION_STAGES.map((stage) => [stage, "2026-08-01"]))
  assert.equal(nextStage(all), null)
  assert.equal(nextOperation(all), "laydown")
})
