import assert from "node:assert/strict"
import test from "node:test"
import {
  evaluateReleaseEligibility,
  type FabricationReadiness,
} from "../../construction/domain/quality-release"
import {
  listRftShortfall,
  type ErectionReadinessFacts,
} from "../../construction/application/describe-erection-readiness"
import {
  derivePressureTestState,
  type PressureTestWorkflowFacts,
} from "../domain/pressure-test-workflow"
import {
  canOpenWorkflowOperation,
  isWorkflowOperationAvailable,
  summarizeWorkflowPresentation,
  WORKFLOW_OPERATION_MAP,
} from "./test-pack-workflow-model"

test("evaluateReleaseEligibility rejects missing server projection and performs no client fallback", () => {
  // If server projection is authoritative, passing a row with isReleasable=false and empty blockers
  // will NOT be overwritten or recalculated from lineChecked/weldComplete.
  const serverInput: FabricationReadiness = {
    revisionStatus: "accepted",
    lineTotal: 5,
    lineChecked: 5,
    weldTotal: 5,
    weldComplete: 5,
    supportTotal: 2,
    supportRecorded: 2,
    ndePending: 0,
    pwhtPending: 0,
    isFabricated: true,
    isReleasable: false,
    releaseBlockers: [{ code: "revision_not_accepted", values: { status: "pending" } }],
  }

  const result = evaluateReleaseEligibility(serverInput)
  // Server said isReleasable: false despite counters being 100% complete
  assert.equal(result.isReleasable, false)
  assert.equal(result.blockers.length, 1)
  assert.equal(result.blockers[0].code, "revision_not_accepted")
})

test("listRftShortfall purely returns server rftBlockers without calculating missing stages", () => {
  const facts: ErectionReadinessFacts = {
    toSiteOn: null,
    erectedOn: null,
    weldedBoltedOn: null,
    supportedOn: null,
    ndePending: 10,
    pwhtPending: 10,
    isRft: false,
    rftOn: null,
    rftBlockers: [{ kind: "welded_bolted" }],
  }

  // Even though ndePending=10 and supportedOn=null, server returned only welded_bolted
  const shortfall = listRftShortfall(facts)
  assert.deepEqual(shortfall, [{ kind: "welded_bolted" }])
})

test("derivePressureTestState strictly returns server canonicalState without fallback ladder", () => {
  const facts: PressureTestWorkflowFacts = {
    canonicalState: "precommissioned",
    isRft: false, // In raw facts isRft=false would ladder-fallback to "awaiting_rft"
    blindingAssigned: false,
    blindingCompleted: false,
    testingStarted: false,
    testingCompleted: false,
    yEligible: false,
    yReinstated: false,
    precommissioned: false,
    zEligible: false,
    zReinstated: false,
  }

  assert.equal(derivePressureTestState(facts), "precommissioned")
})

test("isWorkflowOperationAvailable adheres to server available_operations contract", () => {
  // Preparatory work is always available
  assert.equal(isWorkflowOperationAvailable("line_check", []), true)
  assert.equal(isWorkflowOperationAvailable("item_clearance", []), true)

  // Empty available_operations disables all workflow operations
  const empty: string[] = []
  assert.equal(isWorkflowOperationAvailable("blinding", empty), false)
  assert.equal(isWorkflowOperationAvailable("testing", empty), false)
  assert.equal(isWorkflowOperationAvailable("y_reinstatement", empty), false)
  assert.equal(isWorkflowOperationAvailable("precommissioning", empty), false)
  assert.equal(isWorkflowOperationAvailable("z_reinstatement", empty), false)

  // Blinding ready
  const blindingAvail = ["blinding"]
  assert.equal(isWorkflowOperationAvailable("blinding", blindingAvail), true)
  assert.equal(isWorkflowOperationAvailable("testing", blindingAvail), false)

  // Testing ready (mapped to testing and testing_start)
  const testingReady = ["testing", "testing_start"]
  assert.equal(isWorkflowOperationAvailable("testing", testingReady), true)
  assert.equal(isWorkflowOperationAvailable("testing", testingReady, "testing_start"), true)
  assert.equal(isWorkflowOperationAvailable("testing", testingReady, "testing_complete"), false)
  assert.equal(isWorkflowOperationAvailable("blinding", testingReady), false)

  // Testing ongoing (mapped to testing and testing_complete)
  const testingOngoing = ["testing", "testing_complete"]
  assert.equal(isWorkflowOperationAvailable("testing", testingOngoing), true)
  assert.equal(isWorkflowOperationAvailable("testing", testingOngoing, "testing_start"), false)
  assert.equal(isWorkflowOperationAvailable("testing", testingOngoing, "testing_complete"), true)

  // Category Y reinstatement
  const yAvail = ["y_reinstatement"]
  assert.equal(isWorkflowOperationAvailable("y_reinstatement", yAvail), true)
  assert.equal(isWorkflowOperationAvailable("precommissioning", yAvail), false)

  // Pre-commissioning
  const precommAvail = ["precommissioning"]
  assert.equal(isWorkflowOperationAvailable("precommissioning", precommAvail), true)
  assert.equal(isWorkflowOperationAvailable("z_reinstatement", precommAvail), false)

  // Category Z reinstatement
  const zAvail = ["z_reinstatement"]
  assert.equal(isWorkflowOperationAvailable("z_reinstatement", zAvail), true)
  assert.equal(isWorkflowOperationAvailable("precommissioning", zAvail), false)
})

test("opening an operation always requires both lifecycle permission and a server workflow permission", () => {
  assert.equal(canOpenWorkflowOperation("blinding", true, true, []), false)
  assert.equal(canOpenWorkflowOperation("y_reinstatement", true, true, []), false)
  assert.equal(canOpenWorkflowOperation("line_check", true, true, []), true)
  assert.equal(canOpenWorkflowOperation("blinding", false, true, ["blinding"]), false)
  assert.equal(canOpenWorkflowOperation("blinding", true, false, ["blinding"]), false)
})

test("summarizeWorkflowPresentation requires workflowRow and does not fall back to client worklists", () => {
  assert.throws(() => {
    // Calling without workflowRow must throw because client fallback is removed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    summarizeWorkflowPresentation({} as any)
  }, /workflowRow is required/)
})

test("WORKFLOW_OPERATION_MAP explicitly defines mapped operations for UI actions", () => {
  assert.deepEqual(WORKFLOW_OPERATION_MAP.blinding, ["blinding"])
  assert.deepEqual(WORKFLOW_OPERATION_MAP.testing, ["testing", "testing_start", "testing_complete"])
  assert.deepEqual(WORKFLOW_OPERATION_MAP.y_reinstatement, ["y_reinstatement"])
  assert.deepEqual(WORKFLOW_OPERATION_MAP.precommissioning, ["precommissioning"])
  assert.deepEqual(WORKFLOW_OPERATION_MAP.z_reinstatement, ["z_reinstatement"])
})
