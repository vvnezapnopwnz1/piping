import assert from "node:assert/strict"

import {
  NDT_METHODS,
  deriveObligations,
  requiresPwht,
  type NdeMatrixRule,
} from "./nde-obligation"

const emptyRule: NdeMatrixRule = {
  id: "rule-1",
  rtCoverage: 0,
  utCoverage: 0,
  mtCoverage: 0,
  ptCoverage: 0,
  pmiCoverage: 0,
  htCoverage: 0,
  pwhtRequired: false,
  pwhtThresholdMm: null,
}

assert.equal(NDT_METHODS.length, 7)

assert.deepEqual(deriveObligations(emptyRule), [])

// Dossier 11.9: a 100 percent requirement is an NDE100 obligation from the start.
assert.deepEqual(deriveObligations({ ...emptyRule, rtCoverage: 100 }), [
  { method: "rt", requiredCoverage: 100, selectionMode: "full" },
])
assert.deepEqual(deriveObligations({ ...emptyRule, utCoverage: 10 }), [
  { method: "ut", requiredCoverage: 10, selectionMode: "spot" },
])
assert.equal(
  deriveObligations({ ...emptyRule, rtCoverage: 100, utCoverage: 10, mtCoverage: 5 }).length,
  3,
)
// vt has no coverage column in the matrix, so it is never derived.
assert.equal(
  deriveObligations({ ...emptyRule, rtCoverage: 100 }).some((item) => item.method === "vt"),
  false,
)

// PWHT: required with no threshold applies to every thickness.
assert.equal(requiresPwht({ ...emptyRule, pwhtRequired: true }, 4), true)
assert.equal(requiresPwht({ ...emptyRule, pwhtRequired: true, pwhtThresholdMm: 10 }, 12), true)
assert.equal(requiresPwht({ ...emptyRule, pwhtRequired: true, pwhtThresholdMm: 10 }, 10), true)
assert.equal(requiresPwht({ ...emptyRule, pwhtRequired: true, pwhtThresholdMm: 10 }, 8), false)
assert.equal(requiresPwht({ ...emptyRule, pwhtRequired: true, pwhtThresholdMm: 10 }, null), false)
assert.equal(requiresPwht(emptyRule, 30), false)
