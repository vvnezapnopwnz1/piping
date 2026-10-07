import assert from "node:assert/strict"
import test from "node:test"
import { evaluateReleaseEligibility, type FabricationReadiness } from "../../domain/quality-release"
import { releaseChecks } from "./release-checks"

const ready: FabricationReadiness = {
  revisionStatus: "accepted",
  lineTotal: 2,
  lineChecked: 2,
  weldTotal: 2,
  weldComplete: 2,
  supportTotal: 1,
  supportRecorded: 1,
  ndePending: 0,
  pwhtPending: 0,
}

test("each independent blocker stays visible", () => {
  const r = { ...ready, lineChecked: 1, weldComplete: 1, supportRecorded: 0, ndePending: 2, pwhtPending: 1 }
  assert.deepEqual(
    releaseChecks(r)
      .filter((c) => !c.complete)
      .map((c) => c.id),
    ["material", "welds", "supports", "nde", "pwht"],
  )
})

test("checklist agrees with the existing domain gate", () => {
  const cases = [
    ready,
    { ...ready, lineTotal: 0, lineChecked: 0 },
    { ...ready, weldTotal: 0, weldComplete: 0, supportTotal: 0, supportRecorded: 0 },
    { ...ready, revisionStatus: "superseded" },
    { ...ready, ndePending: 1 },
    { ...ready, pwhtPending: 1 },
  ]
  for (const r of cases) {
    assert.equal(releaseChecks(r).every((c) => c.complete), evaluateReleaseEligibility(r).isReleasable)
  }
  assert.deepEqual(releaseChecks(cases[1]).find((c) => c.id === "material")?.detail, { key: "noBom" })
  assert.deepEqual(releaseChecks({ ...ready, lineChecked: 1 }).find((c) => c.id === "material")?.detail, { key: "linesTraced", values: { checked: 1, total: 2 } })
})
