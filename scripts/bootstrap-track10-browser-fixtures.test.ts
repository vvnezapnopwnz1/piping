import assert from "node:assert/strict"
import test from "node:test"
import { buildTrack10FixturePlan, isLocalhost, TRACK10_PROJECT_CODE, TRACK10_TEST_PACK_NUMBER } from "./bootstrap-track10-browser-fixtures"

test("Track 10 fixture bootstrap is local-only and deterministic", () => {
  assert.equal(isLocalhost("http://127.0.0.1:54321"), true)
  assert.equal(isLocalhost("https://example.supabase.co"), false)
  const plan = buildTrack10FixturePlan("project-1", ["iso-1", "iso-2"])
  assert.equal(TRACK10_PROJECT_CODE, "TRACK01-A")
  assert.equal(TRACK10_TEST_PACK_NUMBER, "TP-T10-001")
  assert.deepEqual(plan.testPack, { project_id: "project-1", test_pack_number: TRACK10_TEST_PACK_NUMBER, lifecycle: "active" })
  assert.deepEqual(plan.isometricIds, ["iso-1", "iso-2"])
  assert.equal(plan.punchCode.code, "P-T10-001")
})

test("fixture plan never seeds downstream results", () => {
  const plan = buildTrack10FixturePlan("project-1", ["iso-1"])
  assert.equal("lineCheckResult" in plan, false)
  assert.equal("blindingRecord" in plan, false)
  assert.equal("stageEvent" in plan, false)
  assert.equal("reinstatementRecord" in plan, false)
})
