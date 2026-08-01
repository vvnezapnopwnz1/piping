import assert from "node:assert/strict"

import {
  CONSTRUCTION_PHASES,
  CONSTRUCTION_STAGES,
  currentStage,
  isDerivedStage,
  isRecordableStage,
  predecessorOf,
  stageLabel,
  stageOrdinal,
} from "./construction-phase"

assert.deepEqual(CONSTRUCTION_PHASES, ["fabrication", "assembly", "erection"])
assert.equal(CONSTRUCTION_STAGES.length, 8)
assert.equal(CONSTRUCTION_STAGES[0], "start_fab")
assert.equal(CONSTRUCTION_STAGES[7], "laydown")

assert.equal(stageLabel("start_fab"), "Start Fab")
assert.equal(stageLabel("qc_release"), "QC Release")
assert.equal(stageOrdinal("fabricated"), 3)
assert.ok(stageOrdinal("laydown") > stageOrdinal("final_qc"))

// Plan section 3.3: only two stages are free-standing user decisions.
assert.equal(isRecordableStage("start_fab"), true)
assert.equal(isRecordableStage("sent_to_paint"), true)
assert.equal(isRecordableStage("qc_release"), false)
assert.equal(isRecordableStage("fabricated"), false)

// Fabricated has no event row at all; the other two have an owning command.
assert.equal(isDerivedStage("fabricated"), true)
assert.equal(isDerivedStage("material_check"), false)

assert.equal(predecessorOf("start_fab"), null)
assert.equal(predecessorOf("qc_release"), "fabricated")
assert.equal(predecessorOf("laydown"), "final_qc")

assert.equal(currentStage({}, false), null)
assert.equal(currentStage({ start_fab: "2026-08-04" }, false), "start_fab")
assert.equal(
  currentStage({ start_fab: "2026-08-04", material_check: "2026-08-05" }, true),
  "fabricated",
)
assert.equal(
  currentStage({ start_fab: "2026-08-04", qc_release: "2026-08-10" }, true),
  "qc_release",
)
// A null date is not a recorded stage.
assert.equal(currentStage({ start_fab: "2026-08-04", laydown: null }, false), "start_fab")
