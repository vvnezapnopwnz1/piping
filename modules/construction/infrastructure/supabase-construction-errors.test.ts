import assert from "node:assert/strict"
import { mapSupabaseConstructionError } from "./supabase-construction-errors"

const erectionMessages = new Map([
  ["PQC50", "Assembly progress is not part of this demo."],
  ["PQC51", "This weld location does not match the selected construction phase."],
  ["PQC52", "Record the previous erection stage before continuing."],
  ["PQC53", "Record the field weld before recording erection support."],
  ["PQC54", "Record To Site before recording field work."],
  ["PQC55", "RFT is derived automatically after all erection quality gates are closed."],
  ["PQC56", "This field material check is not available for the selected spool."],
  ["PQC57", "This support progress record is not available for the selected spool."],
])

for (const [code, expected] of erectionMessages) {
  assert.equal(mapSupabaseConstructionError({ code }), expected)
}

const generic = mapSupabaseConstructionError(null)
assert.match(generic, /could not be completed/)

assert.match(mapSupabaseConstructionError({ code: "PQC30" }), /could not be found/)
assert.match(mapSupabaseConstructionError({ code: "PQC31" }), /revision/)
assert.match(mapSupabaseConstructionError({ code: "PQC32" }), /step/)
assert.match(mapSupabaseConstructionError({ code: "PQC33" }), /PML/)
assert.match(mapSupabaseConstructionError({ code: "PQC34" }), /WPS|welder/i)
assert.match(mapSupabaseConstructionError({ code: "PQC35" }), /weld point/i)
assert.match(mapSupabaseConstructionError({ code: "PQC36" }), /locked/)
assert.match(mapSupabaseConstructionError({ code: "PQC37" }), /NDE|PWHT/)
assert.match(mapSupabaseConstructionError({ code: "PQC38" }), /already/)
assert.match(mapSupabaseConstructionError({ code: "PQC39" }), /referential|project setup/i)
assert.match(mapSupabaseConstructionError({ code: "42501" }), /permission/)
assert.match(mapSupabaseConstructionError({ code: "23505" }), /already/)
assert.match(mapSupabaseConstructionError({ code: "57014" }), /timed out|timeout/i)

// A server message is never shown verbatim.
const raw = mapSupabaseConstructionError({
  code: "42P01",
  message: 'relation "public.weld_progress_records" does not exist',
})
assert.equal(raw, generic)
assert.equal(raw.includes("relation"), false)
