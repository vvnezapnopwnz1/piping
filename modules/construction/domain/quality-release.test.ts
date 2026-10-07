import assert from "node:assert/strict"

import {
  evaluateReleaseEligibility,
  type FabricationReadiness,
} from "./quality-release"

const ready: FabricationReadiness = {
  lineTotal: 2,
  lineChecked: 2,
  weldTotal: 3,
  weldComplete: 3,
  supportTotal: 1,
  supportRecorded: 1,
  ndePending: 0,
  pwhtPending: 0,
  revisionStatus: "accepted",
}

const full = evaluateReleaseEligibility(ready)
assert.equal(full.isFabricated, true)
assert.equal(full.isReleasable, true)
assert.deepEqual(full.blockers, [])

// Dossier 30 prohibition 8: NDE and PWHT gate the release, not the fabrication.
const pendingNde = evaluateReleaseEligibility({ ...ready, ndePending: 2 })
assert.equal(pendingNde.isFabricated, true)
assert.equal(pendingNde.isReleasable, false)
assert.equal(pendingNde.blockers.length, 1)
assert.deepEqual(pendingNde.blockers[0], { code: "nde_open", values: { count: 2 } })

const pendingPwht = evaluateReleaseEligibility({ ...ready, pwhtPending: 1 })
assert.equal(pendingPwht.isReleasable, false)
assert.deepEqual(pendingPwht.blockers[0], { code: "pwht_open", values: { count: 1 } })

const partialMaterial = evaluateReleaseEligibility({ ...ready, lineChecked: 1 })
assert.equal(partialMaterial.isFabricated, false)
assert.deepEqual(partialMaterial.blockers[0], { code: "material_incomplete", values: { checked: 1, total: 2 } })

const partialWelds = evaluateReleaseEligibility({ ...ready, weldComplete: 1 })
assert.equal(partialWelds.isFabricated, false)
assert.deepEqual(partialWelds.blockers[0], { code: "welding_incomplete", values: { complete: 1, total: 3 } })

const partialSupports = evaluateReleaseEligibility({ ...ready, supportRecorded: 0 })
assert.equal(partialSupports.isFabricated, false)

// An empty bill of materials is never fabricated.
assert.equal(
  evaluateReleaseEligibility({ ...ready, lineTotal: 0, lineChecked: 0 }).isFabricated,
  false,
)

// A superseded revision blocks everything, whatever the counts say.
const superseded = evaluateReleaseEligibility({ ...ready, revisionStatus: "superseded" })
assert.equal(superseded.isReleasable, false)
assert.deepEqual(superseded.blockers[0], { code: "revision_not_accepted", values: { status: "superseded" } })

// Every blocker is reported, not just the first.
assert.equal(
  evaluateReleaseEligibility({ ...ready, lineChecked: 0, ndePending: 1 }).blockers.length,
  2,
)
