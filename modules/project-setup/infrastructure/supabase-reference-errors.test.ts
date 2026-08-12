import assert from "node:assert/strict"
import { mapSupabaseReferenceError } from "./supabase-reference-errors"

assert.equal(
  mapSupabaseReferenceError({ code: "23505", message: "duplicate" }),
  "A reference with this code already exists."
)
assert.equal(
  mapSupabaseReferenceError({ code: "23503", message: "foreign key" }),
  "This reference points outside the selected project or is in use."
)
assert.equal(
  mapSupabaseReferenceError({ code: "23514", message: "Progress weights total must be exactly 100" }),
  "Progress weights total must be exactly 100"
)
assert.equal(
  mapSupabaseReferenceError({ code: "42501", message: "permission denied" }),
  "You do not have permission to manage this project."
)
assert.equal(
  mapSupabaseReferenceError({ code: "UNKNOWN", message: "some error" }),
  "Unable to save reference changes. Please try again."
)

console.log("All supabase-reference-errors.test.ts assertions passed!")
