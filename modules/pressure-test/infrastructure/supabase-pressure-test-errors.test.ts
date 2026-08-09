import assert from "node:assert/strict"
import test from "node:test"
import { mapSupabasePressureTestError } from "./supabase-pressure-test-errors"

test("maps pressure-test command errors without leaking SQL", () => {
  assert.match(mapSupabasePressureTestError({ code: "PQC84" }), /Ready for Test/)
  assert.match(mapSupabasePressureTestError({ code: "PQC86" }), /reinstatement/)
  assert.equal(mapSupabasePressureTestError({ code: "42P01" }), "The pressure-test action could not be completed. Please try again.")
})
