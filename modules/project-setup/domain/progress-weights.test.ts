import assert from "node:assert/strict"
import { validatePhaseWeights } from "./progress-weights"

// Disabled assembly check
assert.equal(
  validatePhaseWeights("assembly", [{ activity: "FITUP", weight: 100 }], false).ok,
  false
)

// Empty items
assert.equal(
  validatePhaseWeights("prefabrication", [], true).ok,
  false
)

// Blank activity
assert.equal(
  validatePhaseWeights("prefabrication", [{ activity: " ", weight: 100 }], true).ok,
  false
)

// Total not 100
assert.equal(
  validatePhaseWeights("prefabrication", [{ activity: "FITUP", weight: 50 }], true).ok,
  false
)

// Valid 100% total
assert.equal(
  validatePhaseWeights(
    "prefabrication",
    [
      { activity: "FITUP", weight: 40 },
      { activity: "WELD", weight: 60 },
    ],
    true
  ).ok,
  true
)

console.log("All progress-weights.test.ts assertions passed!")
