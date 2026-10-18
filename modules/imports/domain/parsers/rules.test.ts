import assert from "node:assert/strict"
import { applyTypeRules } from "./rules"
import type { ParsedRow } from "./registry"

function row(rowNumber: number, values: Record<string, unknown>): ParsedRow {
  return { rowNumber, rawValues: {}, normalizedValues: values, action: "create" }
}

function run() {
  // Dossier 11.6: WPS ranges must satisfy to >= from.
  const wps = applyTypeRules("welding_procedure", [
    row(1, { diameter_from_inch: 2, diameter_to_inch: 1, thickness_from_mm: 3, thickness_to_mm: 9 }),
    row(2, { diameter_from_inch: 1, diameter_to_inch: 4, thickness_from_mm: 9, thickness_to_mm: 3 }),
    row(3, { diameter_from_inch: 1, diameter_to_inch: 4, thickness_from_mm: 3, thickness_to_mm: 9 }),
  ])
  assert.equal(wps.length, 2)
  assert.equal(wps[0].rowNumber, 1)
  assert.equal(wps[0].columnName, "diameter_to_inch")
  assert.equal(wps[0].severity, "blocker")
  assert.equal(wps[1].rowNumber, 2)
  assert.equal(wps[1].columnName, "thickness_to_mm")
  assert.deepEqual(wps[0], { rowNumber: 1, columnName: "diameter_to_inch", severity: "blocker", code: "INVALID_RANGE", range: "diameter" })
  assert.deepEqual(wps[1], { rowNumber: 2, columnName: "thickness_to_mm", severity: "blocker", code: "INVALID_RANGE", range: "thickness" })

  // Phase 4a F2: the dates come from the file. Blank is the parser's REQUIRED, malformed is INVALID_DATE here.
  const wpsDates = applyTypeRules("welding_procedure", [
    row(1, { approved_on: "31/12/2026" }),
    row(2, { approved_on: "2026-09-01" }),
    row(3, { approved_on: null }),
    row(4, { approved_on: "2026-02-30" }),
  ])
  assert.deepEqual(wpsDates, [
    { rowNumber: 1, columnName: "approved_on", severity: "blocker", code: "INVALID_DATE" },
    { rowNumber: 4, columnName: "approved_on", severity: "blocker", code: "INVALID_DATE" },
  ])
  const welderDates = applyTypeRules("welder_qualification", [
    row(1, { expires_on: "next year" }),
    row(2, { expires_on: "2027-06-30" }),
    row(3, { expires_on: null }),
  ])
  assert.deepEqual(welderDates, [{ rowNumber: 1, columnName: "expires_on", severity: "blocker", code: "INVALID_DATE" }])

  // Dossier 11.9: coverages are percentages.
  const nde = applyTypeRules("nde_matrix", [
    row(1, { weld_location: "shop", rt_coverage: 120 }),
    row(2, { weld_location: "field", rt_coverage: 100 }),
  ])
  assert.equal(nde.length, 1)
  assert.equal(nde[0].code, "OUT_OF_RANGE")
  assert.equal(nde[0].rowNumber, 1)
  assert.deepEqual(nde[0], { rowNumber: 1, columnName: "rt_coverage", severity: "blocker", code: "OUT_OF_RANGE", bound: "percent" })

  // weld_location must be one of the three supported values.
  const badLocation = applyTypeRules("nde_matrix", [row(1, { weld_location: "orbital" })])
  assert.deepEqual(badLocation[0], { rowNumber: 1, columnName: "weld_location", severity: "blocker", code: "INVALID_VALUE", expected: ["shop", "assembly", "field"] })

  // Dossier 11.10: thickness and diameter must be positive.
  const thickness = applyTypeRules("thickness_flange", [
    row(1, { diameter_inch: 0, thickness_mm: 5 }),
    row(2, { diameter_inch: 6, thickness_mm: -1 }),
  ])
  assert.equal(thickness.length, 2)
  assert.equal(thickness[0].severity, "blocker")
  assert.deepEqual(thickness[0], { rowNumber: 1, columnName: "diameter_inch", severity: "blocker", code: "OUT_OF_RANGE", bound: "positive" })

  // Duplicate natural keys inside one file are a blocker, not a silent last-wins.
  const dupes = applyTypeRules("piping_material_list", [
    row(1, { ident_code: "ID-1", trace_number: "HT-1" }),
    row(2, { ident_code: "ID-1", trace_number: "HT-1" }),
  ])
  assert.equal(dupes.length, 1)
  assert.equal(dupes[0].code, "DUPLICATE_IN_FILE")
  assert.equal(dupes[0].rowNumber, 2)
  assert.deepEqual(dupes[0], { rowNumber: 2, columnName: "ident_code", severity: "blocker", code: "DUPLICATE_IN_FILE", keys: ["ident_code", "trace_number"] })

  // PML rows with no type-specific defects produce nothing.
  assert.equal(applyTypeRules("piping_material_list", [row(1, { ident_code: "A", trace_number: "B" })]).length, 0)

  const flange = applyTypeRules("flange_progress", [row(1, {
    iso_number: "ISO-1", revision: "R0", bt_number: "BT-1", jointing_method: "TORQUE",
    jointing_value: 120, joint_category: "X", reason: "normal", joint_date: "2026-08-04",
    report_number: "R-1", jointer_codes: ["J-1", "j-1"], tag_number: "T-1",
  })])
  assert.equal(flange.some((issue) => issue.code === "DUPLICATE_JOINTER" && issue.severity === "blocker"), true)
  assert.equal(flange.some((issue) => issue.code === "UT_CONFIGURATION_WARNING" && issue.severity === "warning"), true)
  assert.deepEqual(applyTypeRules("flange_progress", [row(2, { jointing_value: 1, joint_date: "bad", jointer_codes: [] })])[0], { rowNumber: 2, columnName: "joint_date", severity: "blocker", code: "INVALID_DATE" })
  assert.equal(applyTypeRules("flange_progress", [row(2, { jointing_value: -1, joint_date: "bad", jointer_codes: [] })]).some((issue) => issue.severity === "blocker"), true)

  const compositionRows = [
    row(1, {
      test_pack_number: "TP-1", system: "SYS-1", subsystem: "SUB-1", test_pack_revision: "0", test_medium: "P",
      test_pressure: 12, planned_start_on: "2026-08-10", planned_end_on: "2026-08-12", priority: "HIGH",
      service_class: "SC-1", line_service: "LS-1", volume_m3: 10, test_pack_location: "UNIT 1", iso_number: "ISO-1",
    }),
    row(2, {
      test_pack_number: "TP-1", system: "SYS-1", subsystem: "SUB-1", test_pack_revision: "0", test_medium: "X",
      test_pressure: 0, planned_start_on: "2026-08-12", planned_end_on: "2026-08-11", priority: "LOW",
      service_class: "SC-2", line_service: "LS-1", volume_m3: -1, test_pack_location: "UNIT 1", iso_number: "ISO-2",
    }),
  ]
  const compositionIssues = applyTypeRules("test_pack_composition", compositionRows)
  assert.equal(compositionIssues.some((issue) => issue.code === "INVALID_VALUE" && issue.columnName === "test_medium" && issue.expected.join() === "H,P,V"), true)
  assert.equal(compositionIssues.some((issue) => issue.code === "INVALID_RANGE" && issue.range === "plannedDates"), true)
  for (const issue of compositionIssues) assert.equal("message" in issue, false)
  assert.equal(compositionIssues.some((issue) => issue.code === "INCONSISTENT_TEST_PACK_METADATA"), true)
  assert.equal(compositionIssues.some((issue) => issue.code === "INVALID_RANGE"), true)
  assert.equal(compositionIssues.some((issue) => issue.code === "OUT_OF_RANGE" && issue.columnName === "test_pressure"), true)

  console.log("All rules.test.ts assertions passed!")
}

run()
