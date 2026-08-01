import assert from "node:assert/strict"
import { CHANGE_TYPES, changeTypeLabel, summarizeChanges } from "./diff"
import { PROGRESS_KINDS, REVISION_DECISIONS, REVISION_STATUSES, decisionLabel, isDuplicateRevisionNumber, isRevisionEditable, keepsEntity, progressKindsFor, requiresWeldReview } from "./revision"

assert.equal(REVISION_STATUSES.length, 3)
assert.equal(REVISION_DECISIONS.length, 4)
assert.equal(decisionLabel("rework"), "Rework")
assert.equal(PROGRESS_KINDS.length, 3)
assert.equal(isRevisionEditable("superseded"), false)
assert.deepEqual(progressKindsFor("rework"), ["fabrication_start", "sent_to_paint", "paint"])
assert.deepEqual(progressKindsFor("cancelled"), [])
assert.equal(keepsEntity("cancelled"), false)
assert.equal(requiresWeldReview("rework"), true)
assert.equal(isDuplicateRevisionNumber(["R0", "R1"], " r1 "), true)
assert.equal(CHANGE_TYPES.length, 4)
assert.equal(changeTypeLabel("revised"), "Revised")
assert.deepEqual(summarizeChanges([{ isoNumber: "A", entityType: "spool", entityKey: "S1", spoolNumber: "S1", changeType: "new", requiresDecision: false, decision: null }]), { new: 1, revised: 0, unchanged: 0, removed: 0 })
