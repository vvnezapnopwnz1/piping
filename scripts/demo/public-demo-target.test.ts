import assert from "node:assert/strict"
import test from "node:test"

import {
  PIPEQC_PUBLIC_DEMO_ORIGIN,
  assertPublicDemoSupabaseTarget,
} from "./public-demo-target"

test("accepts only the configured public demo origin", () => {
  assert.equal(
    assertPublicDemoSupabaseTarget(PIPEQC_PUBLIC_DEMO_ORIGIN).origin,
    PIPEQC_PUBLIC_DEMO_ORIGIN,
  )
})

test("rejects the app stand, the local stack and every non-exact origin", () => {
  const rejectedTargets = [
    "",
    "http://demo.piping-qc-work.shop",
    "https://app.piping-qc-work.shop",
    "https://supabase.piping-qc-work.shop",
    "http://127.0.0.1:54321",
    "https://demo.piping-qc-work.shop/",
    "https://demo.piping-qc-work.shop?x=1",
    "https://user:password@demo.piping-qc-work.shop",
  ]

  for (const target of rejectedTargets) {
    assert.throws(
      () => assertPublicDemoSupabaseTarget(target),
      /PipeQC public demo/i,
      target,
    )
  }
})
