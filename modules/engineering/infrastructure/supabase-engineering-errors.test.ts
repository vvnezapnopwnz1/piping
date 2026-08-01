import assert from "node:assert/strict"
import { mapSupabaseEngineeringError } from "./supabase-engineering-errors"

assert.match(mapSupabaseEngineeringError({ code: "PQC10" }), /already been applied/)
assert.match(mapSupabaseEngineeringError({ code: "PQC20" }), /not be found/)
assert.match(mapSupabaseEngineeringError({ code: "PQC21" }), /read-only/)
assert.match(mapSupabaseEngineeringError({ code: "PQC22" }), /decision/)
assert.match(mapSupabaseEngineeringError({ code: "PQC23" }), /revision number/)
assert.match(mapSupabaseEngineeringError({ code: "PQC25" }), /weld\.txt/)
assert.match(mapSupabaseEngineeringError({ code: "PQC26" }), /blocking/)
assert.match(mapSupabaseEngineeringError({ code: "42501" }), /permission/)
const leaked = mapSupabaseEngineeringError({ code: "P0001", message: 'null value in column "spool_id" violates not-null constraint' })
assert.doesNotMatch(leaked, /spool_id|not-null/)
assert.equal(mapSupabaseEngineeringError(null), mapSupabaseEngineeringError(undefined))
