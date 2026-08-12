import assert from "node:assert/strict"
import test from "node:test"

import { assertLocalSupabaseTarget } from "./local-target"

test("accepts explicit local HTTP Supabase origins", () => {
  for (const value of [
    "http://localhost:54321",
    "http://127.0.0.1:54321",
    "http://[::1]:54321",
  ]) {
    assert.equal(assertLocalSupabaseTarget(value).origin, value)
  }
})

test("rejects targets that are not exact local origins", () => {
  const rejectedTargets = [
    "",
    "not-a-url",
    "https://localhost:54321",
    "http://example.com:54321",
    "http://localhost.example.com:54321",
    "http://127.0.0.2:54321",
    "http://[::2]:54321",
    "http://0.0.0.0:54321",
    "http://localhost:54321/rest/v1",
    "http://localhost:54321/rest/..",
    "http://user:secret@localhost:54321",
    "http://@localhost:54321",
    "http://localhost:54321?x=1",
    "http://localhost:54321?",
    "http://localhost:54321#fragment",
    "http://localhost:54321#",
  ]

  for (const value of rejectedTargets) {
    assert.throws(
      () => assertLocalSupabaseTarget(value),
      (error: unknown) => {
        assert.match(String(error), /local Supabase/i)
        if (value !== "") {
          assert.equal(String(error).includes(value), false)
        }
        return true
      },
    )
  }
})
