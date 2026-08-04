import assert from "node:assert/strict"

import {
  ERECTION_STAGES,
  erectionStageLabel,
  erectionStageOrdinal,
  erectionStagePredecessor,
  isRecordableErectionStage,
} from "./erection-stage"

assert.deepEqual(ERECTION_STAGES, ["to_site", "erected", "welded_bolted", "supported", "rft"])
assert.equal(erectionStageOrdinal("to_site"), 1)
assert.equal(erectionStageOrdinal("rft"), 5)
assert.equal(erectionStagePredecessor("to_site"), null)
assert.equal(erectionStagePredecessor("welded_bolted"), "erected")
assert.equal(erectionStageLabel("welded_bolted"), "Welded / Bolted")
assert.equal(isRecordableErectionStage("rft"), false)
assert.equal(isRecordableErectionStage("supported"), true)
