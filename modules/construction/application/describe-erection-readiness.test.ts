import { test } from "node:test"
import assert from "node:assert/strict"

import {
  currentErectionStage,
  listRftShortfall,
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

assert.equal(currentErectionStage(FACTS), "not_started")
assert.equal(currentErectionStage({ ...FACTS, toSiteOn: "2026-08-01" }), "to_site")
assert.equal(
  currentErectionStage({ ...FACTS, toSiteOn: "2026-08-01", erectedOn: "2026-08-02" }),
  "erected",
)
assert.equal(currentErectionStage({ ...FACTS, weldedBoltedOn: "2026-08-03" }), "welded_bolted")
assert.equal(currentErectionStage({ ...FACTS, supportedOn: "2026-08-04" }), "supported")
// RFT wins over every stage, and it is read from is_rft rather than from rft_on: the view can
// only produce rft_on when is_rft holds, but the stage must not depend on that.
assert.equal(
  currentErectionStage({ ...FACTS, supportedOn: "2026-08-04", isRft: true, rftOn: null }),
  "rft",
)

assert.deepEqual(toStageEvidence({ ...FACTS, ndePending: 3, toSiteOn: "2026-08-01" }), {
  toSiteOn: "2026-08-01",
  erectedOn: null,
  weldedBoltedOn: null,
  supportedOn: null,
})

test("an RFT spool has nothing outstanding", () => {
  assert.deepEqual(listRftShortfall({ ...FACTS, isRft: true }), [])
})

test("missing stages come first, then open NDE and PWHT with their counts", () => {
  assert.deepEqual(listRftShortfall(FACTS), [{ kind: "welded_bolted" }, { kind: "supported" }])
  assert.deepEqual(
    listRftShortfall({ ...FACTS, weldedBoltedOn: "2026-08-03", supportedOn: "2026-08-04", ndePending: 2, pwhtPending: 1 }),
    [{ kind: "nde", count: 2 }, { kind: "pwht", count: 1 }],
  )
})
