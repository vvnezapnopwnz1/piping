import assert from "node:assert/strict"

import {
  buildTrack05FixturePlan,
  isLocalhost,
  planInsertCount,
} from "./bootstrap-track05-browser-fixtures"

assert.equal(isLocalhost("http://127.0.0.1:54321"), true)
assert.equal(isLocalhost("https://abc.supabase.co"), false)

const plan = buildTrack05FixturePlan("project-1", "sub-1", "mt-1", "wps-1", "cat-1", "ls-1", "ral-1")

// Every column named here must exist in the schema. The first version of this script
// wrote `name` into project_subcontractors, whose column is `description not null`, and
// never wrote a single row as a result.
assert.ok(plan.subcontractors.every((row) => typeof row.description === "string"))
assert.ok(plan.subcontractors.some((row) => row.code === "SUB-T5"))
assert.ok(!("name" in plan.subcontractors[0]))

assert.ok(plan.weldingProcedures.every((row) => row.diameter_to >= row.diameter_from))
assert.ok(plan.weldingProcedures.every((row) => row.thickness_to >= row.thickness_from))

// Two welders, because a joint's second point needs a different one.
assert.equal(plan.welders.length, 2)
assert.ok(plan.welders.every((row) => row.subcontractor_id === "sub-1"))
assert.equal(plan.welderWpsLinks.length, 2)

// The PML must cover every ident code scripts/trace.txt imports.
assert.ok(plan.pmlRecords.some((row) => row.ident_code === "IDN-T5-100"))
assert.ok(plan.pmlRecords.some((row) => row.ident_code === "IDN-T5-200"))
assert.ok(plan.pmlRecords.some((row) => row.ident_code === "IDN-T5-300"))
assert.ok(plan.pmlRecords.every((row) => row.trace_number.startsWith("HEAT-")))

// project_locations.category_id is not null, so the category must be seeded first.
assert.equal(plan.locationCategories.length, 1)
assert.ok(plan.locations.every((row) => row.category_id === "cat-1"))

// project_paint_matrix_rules has six further not-null columns beyond the DFT.
assert.equal(plan.lineServices.length, 1)
assert.ok(plan.ralCodes.every((row) => row.line_service_id === "ls-1"))
assert.ok(
  plan.paintMatrixRules.every(
    (row) =>
      row.line_service_id === "ls-1" &&
      row.ral_code_id === "ral-1" &&
      typeof row.blasting_required === "boolean" &&
      typeof row.primer_required === "boolean" &&
      row.intermediate_coat_count >= 0 &&
      row.final_coat_count >= 1 &&
      row.required_final_dft_microns > 0,
  ),
)

// planInsertCount must count only what the script writes, so the log line is honest.
// 1 subcontractor + 1 WPS + 2 welders + 2 links + 3 PML + 1 category + 1 location
// + 1 line service + 1 RAL + 1 paint rule = 14.
assert.equal(planInsertCount(plan), 14)
