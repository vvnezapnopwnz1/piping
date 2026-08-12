import assert from "node:assert/strict"
import { describeRevisionApplyGate, groupByIsometric, unresolvedItems, weldItemsForSpool } from "./resolve-revision"
import type { PreviewChangeItem } from "../domain/diff"

const items: PreviewChangeItem[] = [
  { isoNumber: "ISO-A", entityType: "spool", entityKey: "SP-1", spoolNumber: "SP-1", changeType: "revised", requiresDecision: true, decision: "rework" },
  { isoNumber: "ISO-A", entityType: "weld_joint", entityKey: "W-1", spoolNumber: "SP-1", changeType: "revised", requiresDecision: true, decision: null },
  { isoNumber: "ISO-A", entityType: "weld_joint", entityKey: "W-2", spoolNumber: "SP-1", changeType: "unchanged", requiresDecision: true, decision: "not_done" },
  { isoNumber: "ISO-B", entityType: "spool", entityKey: "SP-9", spoolNumber: "SP-9", changeType: "new", requiresDecision: false, decision: null },
]
assert.deepEqual(unresolvedItems(items).map((item) => item.entityKey), ["W-1"])
assert.deepEqual(Array.from(groupByIsometric(items).keys()), ["ISO-A", "ISO-B"])
assert.deepEqual(weldItemsForSpool(items, "ISO-A", "SP-1").map((item) => item.entityKey), ["W-1", "W-2"])
assert.equal(describeRevisionApplyGate({ status: "validated", alreadyApplied: false, blockerCount: 2, unresolvedCount: 0 }).allowed, false)
// unresolvedCount counts items awaiting a decision, not revised spools: a browser walk on
// 2026-08-02 showed "2 revised spools or reworked welds" when one spool was revised and the
// other was Unchanged but still required a decision. The sentence must say what it counts.
assert.deepEqual(describeRevisionApplyGate({ status: "validated", alreadyApplied: false, blockerCount: 0, unresolvedCount: 3 }), { allowed: false, reason: "3 items still need a decision before this import can be applied." })
assert.deepEqual(describeRevisionApplyGate({ status: "validated", alreadyApplied: false, blockerCount: 0, unresolvedCount: 1 }), { allowed: false, reason: "1 item still needs a decision before this import can be applied." })
assert.equal(describeRevisionApplyGate({ status: "applied", alreadyApplied: true, blockerCount: 0, unresolvedCount: 0 }).allowed, false)
assert.equal(describeRevisionApplyGate({ status: "uploaded", alreadyApplied: false, blockerCount: 0, unresolvedCount: 0 }).allowed, false)
assert.deepEqual(describeRevisionApplyGate({ status: "validated", alreadyApplied: false, blockerCount: 0, unresolvedCount: 0, warningCount: 7 }), { allowed: true, reason: null })
