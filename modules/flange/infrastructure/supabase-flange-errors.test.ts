import assert from "node:assert/strict"
import test from "node:test"
import { mapSupabaseFlangeError } from "./supabase-flange-errors"

test("maps stable flange command errors and hides raw SQL", () => {
  assert.match(mapSupabaseFlangeError({ code: "PQC70" }), /permission|manage/i)
  assert.match(mapSupabaseFlangeError({ code: "PQC72" }), /current|revision/i)
  assert.match(mapSupabaseFlangeError({ code: "PQC75" }), /jointer/i)
  assert.match(mapSupabaseFlangeError({ code: "PQC76" }), /correction|already/i)
  const generic = mapSupabaseFlangeError({ code: "42P01", message: 'relation "flange_progress_records" does not exist' })
  assert.equal(generic.includes("relation"), false)
})
