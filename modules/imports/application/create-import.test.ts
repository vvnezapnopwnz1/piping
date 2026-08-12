import assert from "node:assert/strict"
import { validateSheet } from "./create-import"

function run() {
  // Shape issues and type-rule issues arrive in one list.
  const outcome = validateSheet("welding_procedure", [
    ["WPS Code", "Subcontractor", "Material Type", "Diameter From", "Diameter To", "Thickness From", "Thickness To"],
    ["WPS-1", "SUB-A", "CS", "2", "1", "3", "9"],
    ["WPS-2", "SUB-A", "CS", "1", "4", "3", "9"],
  ])

  assert.equal(outcome.rows.length, 2)
  assert.equal(outcome.issues.length, 1)
  assert.equal(outcome.issues[0].code, "INVALID_RANGE")
  assert.equal(outcome.summary.blockerCount, 1)
  assert.equal(outcome.summary.conflictCount, 0)
  assert.equal(outcome.canSubmit, true, "a file with blockers may still be submitted for the record")

  const clean = validateSheet("piping_material_list", [
    ["MRR Number", "Ident Code", "Trace Number"],
    ["MRR-1", "ID-1", "HT-1"],
  ])
  assert.equal(clean.issues.length, 0)
  assert.equal(clean.summary.blockerCount, 0)

  // A structurally broken sheet yields zero rows and one blocker.
  const broken = validateSheet("piping_material_list", [["Wrong"], ["x"]])
  assert.equal(broken.rows.length, 0)
  assert.equal(broken.summary.blockerCount > 0, true)

  console.log("All create-import.test.ts assertions passed!")
}

run()
