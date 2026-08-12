import assert from "node:assert/strict"

import {
  constructionPhaseForWeldLocation,
  isRecordableForPhase,
  stageBelongsToPhase,
} from "./phase-policy"

assert.equal(stageBelongsToPhase("fabrication", "start_fab"), true)
assert.equal(stageBelongsToPhase("fabrication", "to_site"), false)
assert.equal(stageBelongsToPhase("erection", "supported"), true)
assert.equal(stageBelongsToPhase("assembly", "rft"), false)
assert.equal(isRecordableForPhase("erection", "rft"), false)
assert.equal(isRecordableForPhase("erection", "welded_bolted"), true)
assert.equal(isRecordableForPhase("fabrication", "sent_to_paint"), true)
assert.equal(constructionPhaseForWeldLocation("shop"), "fabrication")
assert.equal(constructionPhaseForWeldLocation("field"), "erection")
assert.equal(constructionPhaseForWeldLocation("assembly"), null)
