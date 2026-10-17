import assert from "node:assert/strict"
import test from "node:test"

import { PIPEQC_HOSTED_DEMO_ORIGIN } from "../demo/hosted-target"
import {
  readUpgEnv,
  upgTargetFromArgv,
  UPG_HOSTED_CONFIRMATION,
} from "./operator"

const local = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "publishable-secret-value",
  TRACK01_FIXTURE_PASSWORD: "password-secret-value",
  SUPABASE_SERVICE_ROLE_KEY: "service-secret-value",
} as unknown as NodeJS.ProcessEnv

const hosted = {
  SUPABASE_URL: PIPEQC_HOSTED_DEMO_ORIGIN,
  SUPABASE_PUBLISHABLE_KEY: "hosted-publishable-key",
  TRACK01_FIXTURE_PASSWORD: "hosted-password-value",
  SUPABASE_SECRET_KEY: "hosted-secret-key",
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

test("local target refuses the KZ origin", () => {
  assert.throws(
    () => readUpgEnv({ ...local, SUPABASE_URL: PIPEQC_HOSTED_DEMO_ORIGIN } as unknown as NodeJS.ProcessEnv, "local"),
    (error: Error) => /non-local/.test(error.message),
  )
})

test("hosted target accepts only the KZ origin", () => {
  const env = readUpgEnv(hosted, "hosted")
  assert.equal(env.url, PIPEQC_HOSTED_DEMO_ORIGIN)

  const rejectedUrls = [
    "https://lmjkqcdmxehknipeoeye.supabase.co",
    "http://127.0.0.1:54321",
    "https://supabase.piping-qc-work.shop/",
  ]
  for (const url of rejectedUrls) {
    assert.throws(
      () => readUpgEnv({ ...hosted, SUPABASE_URL: url } as unknown as NodeJS.ProcessEnv, "hosted"),
      /PipeQC hosted demo/,
    )
  }
})

test("hosted target prefers SUPABASE_SECRET_KEY over SUPABASE_SERVICE_ROLE_KEY", () => {
  const env = readUpgEnv(
    {
      ...hosted,
      SUPABASE_SECRET_KEY: "FAKE-SECRET",
      SUPABASE_SERVICE_ROLE_KEY: "FAKE-SERVICE-ROLE",
    } as unknown as NodeJS.ProcessEnv,
    "hosted",
  )
  assert.equal(env.serviceRoleKey, "FAKE-SECRET")
})

test("missing hosted variables are named, never echoed", () => {
  assert.throws(
    () =>
      readUpgEnv(
        {
          ...hosted,
          TRACK01_FIXTURE_PASSWORD: "",
          SUPABASE_SECRET_KEY: "FAKE-SECRET-VALUE",
        } as unknown as NodeJS.ProcessEnv,
        "hosted",
      ),
    (error: Error) =>
      error.message.includes("TRACK01_FIXTURE_PASSWORD") &&
      !error.message.includes("FAKE-SECRET-VALUE") &&
      error.message.includes("~/.pipeqc-hosted.env"),
  )
})

test("upgTargetFromArgv requires the exact flag", () => {
  assert.equal(upgTargetFromArgv([]), "local")
  assert.equal(upgTargetFromArgv(["--confirm-hosted"]), "local")
  assert.equal(upgTargetFromArgv(["--week", "1", UPG_HOSTED_CONFIRMATION]), "hosted")
  assert.equal(upgTargetFromArgv(["--week", "1", "--confirm-hosted-upg"]), "hosted")
})

test("running without confirmation flag against KZ variables refuses as non-local", () => {
  const target = upgTargetFromArgv(["--week", "1"])
  assert.equal(target, "local")
  assert.throws(
    () => readUpgEnv(hosted, target),
    /non-local/,
  )
})

