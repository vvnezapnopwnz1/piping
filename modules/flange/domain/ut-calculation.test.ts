import assert from "node:assert/strict"
import {
  calculateFlangeUt,
  selectFlangeUtRule,
  type FlangeUtRule,
} from "./ut-calculation"

const rules: FlangeUtRule[] = [
  { diameterFromInch: 2, diameterToInch: 8, flangeRating: null, coefficientDiameter: 2, coefficientRating: 3 },
  { diameterFromInch: 2, diameterToInch: 8, flangeRating: "150#", coefficientDiameter: 4, coefficientRating: 5 },
]

assert.equal(selectFlangeUtRule(rules, 6, "150#")?.coefficientDiameter, 4)
assert.equal(selectFlangeUtRule(rules, 6, "300#")?.coefficientDiameter, 2)
assert.equal(selectFlangeUtRule(rules, 12, "150#"), null)

const calculated = calculateFlangeUt({
  projectQuantity: 10,
  coefficientDiameter: 4,
  coefficientRating: 5,
  coefficientPunch: 0.5,
})
assert.equal(calculated.calculatedUt, 100)
assert.equal(calculated.formulaVersion, "flange-ut-v1")
assert.equal(calculated.warning, undefined)

for (const missing of ["projectQuantity", "coefficientDiameter", "coefficientRating", "coefficientPunch"] as const) {
  const inputs = {
    projectQuantity: 10,
    coefficientDiameter: 4,
    coefficientRating: 5,
    coefficientPunch: 0.5 as number | null,
  }
  inputs[missing] = null as never
  const result = calculateFlangeUt(inputs)
  assert.equal(result.calculatedUt, null)
  assert.equal(result.warning, "UT not configured")
}

assert.throws(() => calculateFlangeUt({ projectQuantity: 0, coefficientDiameter: 1, coefficientRating: 1, coefficientPunch: 1 }))
assert.throws(() => calculateFlangeUt({ projectQuantity: Number.NaN, coefficientDiameter: 1, coefficientRating: 1, coefficientPunch: 1 }))

console.log("All ut-calculation.test.ts assertions passed!")
