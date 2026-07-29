import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { getSupabasePublicConfig } from "./config"
import type { Database } from "./database.types"

let supabaseBrowserClient: SupabaseClient<Database> | undefined

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (supabaseBrowserClient) {
    return supabaseBrowserClient
  }

  const config = getSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })

  supabaseBrowserClient = createClient<Database>(
    config.url,
    config.publishableKey
  )

  return supabaseBrowserClient
}
