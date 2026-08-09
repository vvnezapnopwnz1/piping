import assert from "node:assert/strict"
import test from "node:test"
import { buildTrack10FixturePlan, buildTrack10ReadOnlyMembershipPlan, pickTrack10Isometrics, isLocalhost, TRACK10_BLOCKED_TEST_PACK_NUMBER, TRACK10_PROJECT_CODE, TRACK10_TEST_PACK_NUMBER } from "./bootstrap-track10-browser-fixtures"

test("Track 10 fixture bootstrap prepares only the blocked pack and shared references", () => {
  assert.equal(isLocalhost("http://127.0.0.1:54321"), true)
  assert.equal(isLocalhost("https://example.supabase.co"), false)
  const plan = buildTrack10FixturePlan("project-1", "iso-blocked")
  assert.equal(TRACK10_PROJECT_CODE, "TRACK01-A")
  assert.equal(TRACK10_TEST_PACK_NUMBER, "TP-T10-001")
  assert.equal(TRACK10_BLOCKED_TEST_PACK_NUMBER, "TP-T10-BLOCKED")
  assert.equal("testPack" in plan, false)
  assert.deepEqual(plan.blockedTestPack, { project_id: "project-1", test_pack_number: TRACK10_BLOCKED_TEST_PACK_NUMBER, lifecycle: "active" })
  assert.deepEqual(plan.blockedMember, { project_id: "project-1", isometric_id: "iso-blocked", source_kind: "manual" })
  assert.equal(plan.punchCode.code, "P-T10-001")
})

test("fixture plan never seeds downstream results", () => {
  const plan = buildTrack10FixturePlan("project-1", "iso-blocked")
  assert.equal("lineCheckResult" in plan, false)
  assert.equal("blindingRecord" in plan, false)
  assert.equal("stageEvent" in plan, false)
  assert.equal("reinstatementRecord" in plan, false)
})

test("Track 10 gives the read-only browser persona a second project without manage access", () => {
  assert.deepEqual(buildTrack10ReadOnlyMembershipPlan("project-b", "reader-1"), {
    membership: { project_id: "project-b", user_id: "reader-1", role: "project_manager", access_role_code: "project_reader", is_active: true },
    functionalRoles: ["qc_engineer"],
  })
})

test("Track 10 selects one ISO blocked only by Line Check and one upstream-blocked ISO", () => {
  assert.deepEqual(pickTrack10Isometrics([
    { isometric_id: "iso-1", is_rft: false, blocker_counts: { LINE_CHECK_PENDING: 1, X_OPEN: 0 } },
    { isometric_id: "iso-blocked", is_rft: false, blocker_counts: { LINE_CHECK_PENDING: 1, NDE_PENDING: 1 } },
  ]), { mainIsometricId: "iso-1", blockedIsometricId: "iso-blocked" })
})
