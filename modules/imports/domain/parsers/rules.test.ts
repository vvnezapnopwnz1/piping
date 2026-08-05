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

  // Dossier 11.9: coverages are percentages.
  const nde = applyTypeRules("nde_matrix", [
    row(1, { weld_location: "shop", rt_coverage: 120 }),
    row(2, { weld_location: "field", rt_coverage: 100 }),
  ])
  assert.equal(nde.length, 1)
  assert.equal(nde[0].code, "OUT_OF_RANGE")
  assert.equal(nde[0].rowNumber, 1)

  // weld_location must be one of the three supported values.
  const badLocation = applyTypeRules("nde_matrix", [row(1, { weld_location: "orbital" })])
  assert.equal(badLocation.some((i) => i.code === "INVALID_VALUE"), true)

  // Dossier 11.10: thickness and diameter must be positive.
  const thickness = applyTypeRules("thickness_flange", [
    row(1, { diameter_inch: 0, thickness_mm: 5 }),
    row(2, { diameter_inch: 6, thickness_mm: -1 }),
  ])
  assert.equal(thickness.length, 2)
  assert.equal(thickness[0].severity, "blocker")

  // Duplicate natural keys inside one file are a blocker, not a silent last-wins.
  const dupes = applyTypeRules("piping_material_list", [
    row(1, { ident_code: "ID-1", trace_number: "HT-1" }),
    row(2, { ident_code: "ID-1", trace_number: "HT-1" }),
  ])
  assert.equal(dupes.length, 1)
  assert.equal(dupes[0].code, "DUPLICATE_IN_FILE")
  assert.equal(dupes[0].rowNumber, 2)

  // PML rows with no type-specific defects produce nothing.
  assert.equal(applyTypeRules("piping_material_list", [row(1, { ident_code: "A", trace_number: "B" })]).length, 0)

  const flange = applyTypeRules("flange_progress", [row(1, {
    iso_number: "ISO-1", revision: "R0", bt_number: "BT-1", jointing_method: "TORQUE",
    jointing_value: 120, joint_category: "X", reason: "normal", joint_date: "2026-08-04",
    report_number: "R-1", jointer_codes: ["J-1", "j-1"], tag_number: "T-1",
  })])
  assert.equal(flange.some((issue) => issue.code === "DUPLICATE_JOINTER" && issue.severity === "blocker"), true)
  assert.equal(flange.some((issue) => issue.code === "UT_CONFIGURATION_WARNING" && issue.severity === "warning"), true)
  assert.equal(applyTypeRules("flange_progress", [row(2, { jointing_value: -1, joint_date: "bad", jointer_codes: [] })]).some((issue) => issue.severity === "blocker"), true)

  console.log("All rules.test.ts assertions passed!")
}

run()
