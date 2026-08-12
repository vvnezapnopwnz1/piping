import assert from "node:assert/strict"
import test from "node:test"

import {
  PIPEQC_HOSTED_DEMO_PROJECT_REF,
  assertHostedSupabaseTarget,
} from "./hosted-target"

test("accepts only the configured hosted PipeQC demo origin", () => {
  const origin = `https://${PIPEQC_HOSTED_DEMO_PROJECT_REF}.supabase.co`

  assert.equal(assertHostedSupabaseTarget(origin).origin, origin)
})

test("rejects every non-demo or non-exact hosted target", () => {
  const rejectedTargets = [
    "",
    "http://lmjkqcdmxehknipeoeye.supabase.co",
    "https://other-project.supabase.co",
    "https://lmjkqcdmxehknipeoeye.supabase.co/",
    "https://lmjkqcdmxehknipeoeye.supabase.co?unsafe=true",
    "https://user:password@lmjkqcdmxehknipeoeye.supabase.co",
  ]

  for (const target of rejectedTargets) {
    assert.throws(
      () => assertHostedSupabaseTarget(target),
      /configured PipeQC hosted demo/i,
      target,
    )
  }
})
