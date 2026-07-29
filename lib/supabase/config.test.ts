import assert from "node:assert/strict"

import { getSupabasePublicConfig } from "./config"

const config = getSupabasePublicConfig({
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
})

assert.deepEqual(config, {
  url: "http://127.0.0.1:54321",
  publishableKey: "test-publishable-key",
})

assert.throws(
  () => getSupabasePublicConfig({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" }),
  /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/
)
