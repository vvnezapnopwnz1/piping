import assert from "node:assert/strict"
import {
  TORQUING_METHODS,
  validateFilmQuantityRuleInput,
  validateUtCalculationRuleInput,
} from "./system-referential"

assert.deepEqual(TORQUING_METHODS, ["Manual", "Torquing", "Tensioning"])

// Film quantity validation assertions
assert.equal(
  validateFilmQuantityRuleInput({
    diameterFromInch: 4,
    diameterToInch: 2,
    thicknessFromMm: 1,
    thicknessToMm: 2,
    filmCount: 2,
  }).ok,
  false
)

assert.equal(
  validateFilmQuantityRuleInput({
    diameterFromInch: 2,
    diameterToInch: 4,
    thicknessFromMm: 1,
    thicknessToMm: 2,
    filmCount: 0,
  }).ok,
  false
)

assert.equal(
  validateFilmQuantityRuleInput({
    diameterFromInch: 2,
    diameterToInch: 4,
    thicknessFromMm: 1,
    thicknessToMm: 2,
    filmCount: 2,
  }).ok,
  true
)

// UT calculation validation assertions
assert.equal(
  validateUtCalculationRuleInput({
    diameterFromInch: 2,
    diameterToInch: 4,
    coefficientDiameter: -1,
    coefficientRating: 1,
  }).ok,
  false
)

assert.equal(
  validateUtCalculationRuleInput({
    diameterFromInch: 2,
    diameterToInch: 4,
    coefficientDiameter: 0.5,
    coefficientRating: 1.2,
  }).ok,
  true
)

console.log("All system-referential.test.ts assertions passed!")
