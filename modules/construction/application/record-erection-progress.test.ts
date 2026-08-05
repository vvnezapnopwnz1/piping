import assert from "node:assert/strict"

import {
  describeErectionStageGate,
  erectionStageDate,
  firstMissingPredecessor,
  isRecordableStage,
  type ErectionStageEvidence,
} from "./record-erection-progress"

const NOTHING: ErectionStageEvidence = {
  toSiteOn: null,
  erectedOn: null,
  weldedBoltedOn: null,
  supportedOn: null,
}

const ON_SITE: ErectionStageEvidence = { ...NOTHING, toSiteOn: "2026-08-01" }
const ERECTED: ErectionStageEvidence = { ...ON_SITE, erectedOn: "2026-08-02" }
const WELDED: ErectionStageEvidence = { ...ERECTED, weldedBoltedOn: "2026-08-03" }

assert.equal(isRecordableStage("to_site"), true)
assert.equal(isRecordableStage("rft"), false)

assert.equal(erectionStageDate("to_site", ON_SITE), "2026-08-01")
assert.equal(erectionStageDate("erected", ON_SITE), null)

// The predecessor chain must match record_erection_progress: to_site, then erected, then
// welded_bolted, then supported.
assert.equal(firstMissingPredecessor("to_site", NOTHING), null)
assert.equal(firstMissingPredecessor("erected", NOTHING), "to_site")
assert.equal(firstMissingPredecessor("welded_bolted", ON_SITE), "erected")
assert.equal(firstMissingPredecessor("supported", ERECTED), "welded_bolted")
assert.equal(firstMissingPredecessor("supported", WELDED), null)

// RFT is derived; the screen must never offer it.
assert.deepEqual(
  describeErectionStageGate({
    stage: "rft",
    evidence: WELDED,
    occurredOn: "2026-08-04",
    canRecord: true,
  }),
  {
    allowed: false,
    reason:
      "Ready for Test is derived from field weld, support, NDE and PWHT evidence and cannot be recorded by hand.",
  },
)

// A reader must be told why, not shown a control that fails server-side.
assert.deepEqual(
  describeErectionStageGate({
    stage: "to_site",
    evidence: NOTHING,
    occurredOn: "2026-08-01",
    canRecord: false,
  }),
  {
    allowed: false,
    reason: "Recording erection progress needs the erection.progress.record capability.",
  },
)

assert.deepEqual(
  describeErectionStageGate({
    stage: "to_site",
    evidence: NOTHING,
    occurredOn: "  ",
    canRecord: true,
  }),
  { allowed: false, reason: "Enter the date this step happened." },
)

assert.deepEqual(
  describeErectionStageGate({
    stage: "supported",
    evidence: ERECTED,
    occurredOn: "2026-08-04",
    canRecord: true,
  }),
  { allowed: false, reason: "Record Welded / Bolted before Supported." },
)

assert.deepEqual(
  describeErectionStageGate({
    stage: "to_site",
    evidence: NOTHING,
    occurredOn: "2026-08-01",
    canRecord: true,
  }),
  { allowed: true, reason: null },
)

// Re-recording a stage that already carries a date is a correction, not an error: the RPC
// appends another event and the view takes the latest.
assert.deepEqual(
  describeErectionStageGate({
    stage: "to_site",
    evidence: ON_SITE,
    occurredOn: "2026-08-05",
    canRecord: true,
  }),
  { allowed: true, reason: null },
)
