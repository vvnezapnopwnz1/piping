import assert from "node:assert/strict"
import test from "node:test"
import { mapSupabasePressureTestError } from "./supabase-pressure-test-errors"

test("maps pressure-test command errors without leaking SQL", () => {
  assert.match(mapSupabasePressureTestError({ code: "PQC84" }), /Ready for Test/)
  assert.match(mapSupabasePressureTestError({ code: "PQC86" }), /reinstatement/)
  assert.match(mapSupabasePressureTestError({ code: "PQT16" }), /Y reinstatement/)
  assert.match(mapSupabasePressureTestError({ code: "PQT09" }), /blinding/)
  assert.match(mapSupabasePressureTestError({ code: "PQT17" }), /test is completed/)
  assert.match(mapSupabasePressureTestError({ code: "PQT18" }), /pre-commissioning/)
  assert.match(mapSupabasePressureTestError({ code: "PQC60" }), /different parameters/)
  assert.equal(mapSupabasePressureTestError({ code: "42P01" }), "The pressure-test action could not be completed. Please try again.")
})
