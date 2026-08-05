import assert from "node:assert/strict"
import {
  deriveFlangeProgressState,
  isFlangeProgressCopyAllowed,
  normalizeFlangeProgressInput,
} from "./flange-progress"

const normalized = normalizeFlangeProgressInput(
  {
    projectId: "project-1",
    flangeJointRevisionId: "revision-1",
    jointCategoryId: "category-1",
    torquingRequirementId: "method-1",
    jointingValue: 125,
    jointDate: "2026-08-05",
    reportNumber: "  REP-1 ",
    tagNumber: " TAG-1 ",
    jointerIds: ["J-01", " J-02 "],
    idempotencyKey: "idem-1",
  },
  new Date("2026-08-05T12:00:00Z"),
)
assert.equal(normalized.ok, true)
if (normalized.ok) {
  assert.deepEqual(normalized.value.jointerIds, ["J-01", "J-02"])
  assert.equal(normalized.value.reportNumber, "REP-1")
  assert.equal(normalized.value.tagNumber, "TAG-1")
}

for (const input of [
  { jointerIds: [] },
  { jointerIds: ["J-01", "j-01"] },
  { jointingValue: 0 },
  { jointDate: "2026-08-06" },
  { reportNumber: " " },
] as const) {
  const result = normalizeFlangeProgressInput(
    {
      projectId: "project-1",
      flangeJointRevisionId: "revision-1",
      jointCategoryId: "category-1",
      torquingRequirementId: "method-1",
      jointingValue: 125,
      jointDate: "2026-08-05",
      reportNumber: "REP-1",
      tagNumber: "TAG-1",
      jointerIds: ["J-01"],
      idempotencyKey: "idem-1",
      ...input,
    },
    new Date("2026-08-05T12:00:00Z"),
  )
  assert.equal(result.ok, false)
}

assert.equal(deriveFlangeProgressState({ hasEffectiveProgress: false, isCurrentRevision: true, isRemoved: false }), "not_started")
assert.equal(deriveFlangeProgressState({ hasEffectiveProgress: true, isCurrentRevision: true, isRemoved: false }), "completed")
assert.equal(deriveFlangeProgressState({ hasEffectiveProgress: true, isCurrentRevision: false, isRemoved: false }), "revision_mismatch")
assert.equal(deriveFlangeProgressState({ hasEffectiveProgress: false, isCurrentRevision: true, isRemoved: true }), "revision_mismatch")

assert.equal(isFlangeProgressCopyAllowed("done_without_modification"), true)
assert.equal(isFlangeProgressCopyAllowed("not_done"), false)
assert.equal(isFlangeProgressCopyAllowed("rework"), false)

console.log("All flange-progress.test.ts assertions passed!")
