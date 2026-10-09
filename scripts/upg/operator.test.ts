import assert from "node:assert/strict"
import test from "node:test"

import { readUpgEnv } from "./operator"

const local = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "publishable-secret-value",
  TRACK01_FIXTURE_PASSWORD: "password-secret-value",
  SUPABASE_SERVICE_ROLE_KEY: "service-secret-value",
} as unknown as NodeJS.ProcessEnv

test("a complete local environment is accepted", () => {
  const env = readUpgEnv(local)
  assert.equal(env.url, local.SUPABASE_URL)
  assert.equal(env.publishableKey, local.SUPABASE_PUBLISHABLE_KEY)
})

test("the Next.js publishable key name is accepted too", () => {
  const { SUPABASE_PUBLISHABLE_KEY: _drop, ...rest } = local
  assert.equal(readUpgEnv({ ...rest, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "next-key" } as unknown as NodeJS.ProcessEnv).publishableKey, "next-key")
})

test("a non-local URL is refused and the error names no secret", () => {
  assert.throws(
    () => readUpgEnv({ ...local, SUPABASE_URL: "https://abc.supabase.co" } as unknown as NodeJS.ProcessEnv),
    (error: Error) => /non-local/.test(error.message) && !/secret-value/.test(error.message),
  )
})

test("a missing value is refused and the error names no secret", () => {
  assert.throws(
    () => readUpgEnv({ ...local, TRACK01_FIXTURE_PASSWORD: "" } as unknown as NodeJS.ProcessEnv),
    (error: Error) => /\.env\.local/.test(error.message) && !/secret-value/.test(error.message),
  )
})
