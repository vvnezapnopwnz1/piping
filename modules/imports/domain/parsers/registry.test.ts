import assert from "node:assert/strict"
import { parseSheet } from "./registry"

function run() {
  // Happy path: headers map to keys, values normalize by kind.
  const ok = parseSheet("piping_material_list", [
    ["MRR Number", "Ident Code", "Trace Number"],
    ["MRR-1", "ID-1", "HT-1"],
    ["MRR-2", "ID-2", "HT-2"],
  ])
  assert.equal(ok.rows.length, 2)
  assert.equal(ok.rows[0].rowNumber, 1)
  assert.deepEqual(ok.rows[0].normalizedValues, {
    mrr_number: "MRR-1",
    ident_code: "ID-1",
    trace_number: "HT-1",
  })
  assert.equal(ok.issues.length, 0)

  // A missing required header is a sheet-level blocker with a null row number.
  const missingHeader = parseSheet("piping_material_list", [
    ["MRR Number", "Ident Code"],
    ["MRR-1", "ID-1"],
  ])
  assert.equal(missingHeader.issues.length, 1)
  assert.equal(missingHeader.issues[0].severity, "blocker")
  assert.equal(missingHeader.issues[0].code, "MISSING_COLUMN")
  assert.equal(missingHeader.issues[0].rowNumber, null)
  assert.equal(missingHeader.rows.length, 0)

  // A blank required cell is a row-level blocker, but parsing continues.
  const blankCell = parseSheet("piping_material_list", [
    ["MRR Number", "Ident Code", "Trace Number"],
    ["MRR-1", "", "HT-1"],
    ["MRR-2", "ID-2", "HT-2"],
  ])
  assert.equal(blankCell.rows.length, 2)
  assert.equal(blankCell.issues.length, 1)
  assert.equal(blankCell.issues[0].severity, "blocker")
  assert.equal(blankCell.issues[0].rowNumber, 1)
  assert.equal(blankCell.issues[0].columnName, "ident_code")

  // Non-numeric input in a number column is a blocker, not a silent NaN.
  const badNumber = parseSheet("thickness_flange", [
    ["Service Class", "Dia Inch", "Thickness", "Flange Rating"],
    ["SC-1", "abc", "5.5", "150#"],
  ])
  assert.equal(badNumber.issues.some((i) => i.code === "NOT_A_NUMBER"), true)
  assert.equal(badNumber.issues[0].severity, "blocker")

  // textList splits on comma and trims.
  const list = parseSheet("welder_qualification", [
    ["Welder Code", "Welder Name", "Subcontractor", "WPS Codes"],
    ["W-1", "Ivan", "SUB-A", "WPS-1, WPS-2"],
  ])
  assert.deepEqual(list.rows[0].normalizedValues.wps_codes, ["WPS-1", "WPS-2"])

  // Fully blank lines are skipped, not reported as errors.
  const blankLine = parseSheet("piping_material_list", [
    ["MRR Number", "Ident Code", "Trace Number"],
    ["", "", ""],
    ["MRR-2", "ID-2", "HT-2"],
  ])
  assert.equal(blankLine.rows.length, 1)
  assert.equal(blankLine.rows[0].normalizedValues.ident_code, "ID-2")
  assert.equal(blankLine.issues.length, 0)

  // An empty sheet is a sheet-level blocker.
  const empty = parseSheet("piping_material_list", [])
  assert.equal(empty.issues[0].code, "EMPTY_SHEET")
  assert.equal(empty.issues[0].severity, "blocker")

  console.log("All registry.test.ts assertions passed!")
}

run()
