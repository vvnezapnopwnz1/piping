import assert from "node:assert/strict"

import {
  currentErectionStageLabel,
  describeRftShortfall,
  toStageEvidence,
  type ErectionReadinessFacts,
} from "./describe-erection-readiness"

const FACTS: ErectionReadinessFacts = {
  toSiteOn: null,
  erectedOn: null,
  weldedBoltedOn: null,
  supportedOn: null,
  ndePending: 0,
  pwhtPending: 0,
  isRft: false,
  rftOn: null,
}

assert.equal(currentErectionStageLabel(FACTS), "not started")
assert.equal(currentErectionStageLabel({ ...FACTS, toSiteOn: "2026-08-01" }), "to site")
assert.equal(
  currentErectionStageLabel({ ...FACTS, toSiteOn: "2026-08-01", erectedOn: "2026-08-02" }),
  "erected",
)
assert.equal(currentErectionStageLabel({ ...FACTS, weldedBoltedOn: "2026-08-03" }), "welded/bolted")
assert.equal(currentErectionStageLabel({ ...FACTS, supportedOn: "2026-08-04" }), "supported")
// RFT wins over every stage label, and it is read from is_rft rather than from rft_on: the
// view can only produce rft_on when is_rft holds, but the label must not depend on that.
assert.equal(
  currentErectionStageLabel({ ...FACTS, supportedOn: "2026-08-04", isRft: true, rftOn: null }),
  "rft",
)

assert.deepEqual(toStageEvidence({ ...FACTS, ndePending: 3, toSiteOn: "2026-08-01" }), {
  toSiteOn: "2026-08-01",
  erectedOn: null,
  weldedBoltedOn: null,
  supportedOn: null,
})

assert.equal(describeRftShortfall({ ...FACTS, isRft: true }), null)

assert.equal(
  describeRftShortfall(FACTS),
  "Welded / Bolted is not recorded; Supported is not recorded.",
)
assert.equal(
  describeRftShortfall({
    ...FACTS,
    weldedBoltedOn: "2026-08-03",
    supportedOn: "2026-08-04",
    ndePending: 2,
    pwhtPending: 1,
  }),
  "2 NDE obligation(s) open; 1 PWHT requirement(s) open.",
)

// Contradictory input must not render as an empty sentence.
assert.equal(
  describeRftShortfall({
    ...FACTS,
    weldedBoltedOn: "2026-08-03",
    supportedOn: "2026-08-04",
    isRft: false,
  }),
  "RFT is closed but no outstanding evidence is reported; reload the page.",
)
