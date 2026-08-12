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

  const testPack = parseSheet("test_pack_composition", [
    ["System", "Subsystem", "Test Pack", "Test Pack Rev", "Test Medium", "Test Pressure", "Planned Start", "Planned End", "Priority", "Service Class", "Line Service", "Volume m3", "Test Pack Location", "ISO Number", "ISO Revision", "Spool Number", "Spool Revision"],
    ["sys-1", "sub-1", "tp-1", "0", "p", "12.5", "10-08-2026", "12-08-2026", "high", "sc-1", "ls-1", "10", "unit 1", "iso-1", "r0", "sp-1", "r0"],
  ])
  assert.equal(testPack.issues.length, 0)
  assert.equal(testPack.rows[0].normalizedValues.test_medium, "P")
  assert.equal(testPack.rows[0].normalizedValues.planned_start_on, "2026-08-10")
  assert.equal(testPack.rows[0].normalizedValues.iso_number, "ISO-1")
  assert.equal(blankLine.issues.length, 0)

  const tracking = parseSheet("tracking_scan", [
    ["ISO Number", "Spool Number", "Location Code", "Direction", "Occurred At", "Device Code", "Operator Email", "External Event ID"],
    ["iso-1", "sp-1", "yard-1", "OUT", "2026-08-01T09:00:00+06:00", "pda-1", "Operator@Example.Test", " event-1 "],
  ])
  assert.equal(tracking.issues.length, 0)
  assert.deepEqual(tracking.rows[0].normalizedValues, {
    iso_number: "ISO-1",
    spool_number: "SP-1",
    location_code: "YARD-1",
    direction: "out",
    occurred_at: "2026-08-01T03:00:00.000Z",
    device_code: "PDA-1",
    operator_email: "operator@example.test",
    external_event_id: "event-1",
  })

  const badTracking = parseSheet("tracking_scan", [
    ["ISO Number", "Spool Number", "Location Code", "Direction", "Occurred At", "Device Code", "Operator Email", "External Event ID"],
    ["ISO-1", "SP-1", "YARD-1", "sideways", "2026-08-01", "PDA-1", "operator@example.test", ""],
  ])
  assert.equal(badTracking.issues.some((issue) => issue.code === "TRACKING_DIRECTION"), true)
  assert.equal(badTracking.issues.some((issue) => issue.code === "TRACKING_TIMESTAMP"), true)

  // An empty sheet is a sheet-level blocker.
  const empty = parseSheet("piping_material_list", [])
  assert.equal(empty.issues[0].code, "EMPTY_SHEET")
  assert.equal(empty.issues[0].severity, "blocker")

  console.log("All registry.test.ts assertions passed!")
}

run()
