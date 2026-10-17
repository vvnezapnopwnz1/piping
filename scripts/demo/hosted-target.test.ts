import assert from "node:assert/strict"
import test from "node:test"

import {
  PIPEQC_HOSTED_DEMO_ORIGIN,
  assertHostedSupabaseTarget,
} from "./hosted-target"

test("accepts only the configured hosted PipeQC demo origin", () => {
  assert.equal(
    assertHostedSupabaseTarget(PIPEQC_HOSTED_DEMO_ORIGIN).origin,
    PIPEQC_HOSTED_DEMO_ORIGIN,
  )
})

test("rejects every non-demo or non-exact hosted target", () => {
  const rejectedTargets = [
    "",
    "http://supabase.piping-qc-work.shop",
    "https://lmjkqcdmxehknipeoeye.supabase.co",
    "https://studio.piping-qc-work.shop",
    "https://supabase.piping-qc-work.shop/",
    "https://supabase.piping-qc-work.shop?unsafe=true",
    "https://user:password@supabase.piping-qc-work.shop",
  ]

  for (const target of rejectedTargets) {
    assert.throws(
      () => assertHostedSupabaseTarget(target),
      /configured PipeQC hosted demo/i,
      target,
    )
  }
})
