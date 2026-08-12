import assert from "node:assert/strict"
import {
  isLocalhost,
  buildTrack03FixturePlan,
  planInsertCount,
} from "./bootstrap-track03-browser-fixtures"

function run() {
  assert.equal(isLocalhost("http://127.0.0.1:54321"), true)
  assert.equal(isLocalhost("http://localhost:54321"), true)
  assert.equal(isLocalhost("https://abcdef.supabase.co"), false)

  const plan = buildTrack03FixturePlan("proj-1")

  // Service classes and weld types are what the NDE matrix and thickness imports
  // resolve against, so the fixture must create them.
  assert.ok(plan.serviceClasses.length >= 2, "plan seeds service classes")
  assert.ok(plan.weldTypes.length >= 2, "plan seeds weld types")
  assert.ok(plan.subcontractors.length >= 1, "plan seeds subcontractors")
  assert.equal(plan.serviceClasses.every((sc) => sc.project_id === "proj-1"), true)

  // Guards against the Track 02 regression: a plan that inserts nothing.
  assert.ok(planInsertCount(plan) > 0, "the plan actually inserts rows")

  console.log("All bootstrap-track03-browser-fixtures.test.ts assertions passed!")
}

run()
