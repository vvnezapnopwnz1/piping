import assert from "node:assert/strict"
import { mapSupabaseImportError } from "./supabase-import-errors"

function run() {
  assert.equal(
    mapSupabaseImportError({ code: "PQC10" }),
    "This import has already been applied. Start a new import to load the file again."
  )
  assert.equal(
    mapSupabaseImportError({ code: "PQC13" }),
    "Some rows still have blocking errors. Fix them in the source file and upload it again."
  )
  assert.equal(
    mapSupabaseImportError({ code: "PQC14" }),
    "This import overwrites existing records. Confirm the overwrite to continue."
  )
  assert.equal(
    mapSupabaseImportError({ code: "42501" }),
    "You do not have permission to manage imports for this project."
  )
  assert.match(mapSupabaseImportError({ code: "PQC77" }), /conflict|state/i)

  // Raw SQL and parser detail must never reach the user.
  const raw = mapSupabaseImportError({
    code: "42P01",
    message: 'relation "public.secret_table" does not exist',
  })
  assert.equal(raw, "The import could not be completed. Please try again.")
  assert.equal(raw.includes("secret_table"), false)
  assert.equal(mapSupabaseImportError(null).includes("relation"), false)

  console.log("All supabase-import-errors.test.ts assertions passed!")
}

run()
