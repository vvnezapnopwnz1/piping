import assert from "node:assert/strict"

import {
  TRACK01_FIXTURE_USERS,
  assertLocalSupabaseUrl,
} from "./bootstrap-track01-browser-fixtures"

assert.doesNotThrow(() => assertLocalSupabaseUrl("http://127.0.0.1:54321"))
assert.doesNotThrow(() => assertLocalSupabaseUrl("http://localhost:54321"))
assert.throws(
  () => assertLocalSupabaseUrl("https://project.supabase.co"),
  /local Supabase URL/,
)
assert.equal(TRACK01_FIXTURE_USERS.length, 6)
assert.equal(
  TRACK01_FIXTURE_USERS.find((user) => user.key === "nde_subcontractor")?.email,
  "track01.nde-subcontractor@example.test",
)
