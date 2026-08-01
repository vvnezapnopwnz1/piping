import assert from "node:assert/strict"

import {
  buildTrack05FixturePlan,
  isLocalhost,
  planInsertCount,
} from "./bootstrap-track05-browser-fixtures"

assert.equal(isLocalhost("http://127.0.0.1:54321"), true)
assert.equal(isLocalhost("https://abc.supabase.co"), false)

const plan = buildTrack05FixturePlan("project-1", "sub-1", "sc-1", "wps-1")

assert.ok(plan.subcontractors.some((row) => row.code === "SUB-T5"))
assert.ok(plan.weldingProcedures.every((row) => row.diameter_to >= row.diameter_from))
assert.ok(plan.weldingProcedures.every((row) => row.thickness_to >= row.thickness_from))
// Two welders, because a joint's second point needs a different one.
assert.equal(plan.welders.length, 2)
assert.ok(plan.welders.every((row) => row.subcontractor_id === "sub-1"))
assert.equal(plan.welderWpsLinks.length, 2)
// The PML must cover the ident codes Track 04's SpoolGen fixture imports.
assert.ok(plan.pmlRecords.some((row) => row.ident_code === "IDN-T5-100"))
assert.ok(plan.pmlRecords.every((row) => row.trace_number.startsWith("HEAT-")))
assert.ok(plan.locations.length > 0)
assert.ok(plan.paintMatrixRules.every((row) => row.required_final_dft_microns > 0))
assert.equal(planInsertCount(plan), 10)
