import assert from "node:assert/strict"

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const originalPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

async function run() {
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    const { getSupabaseBrowserClient } = await import("./browser-client")

    assert.throws(
      () => getSupabaseBrowserClient(),
      /NEXT_PUBLIC_SUPABASE_URL/
    )
  } finally {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    }

    if (originalPublishableKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishableKey
    }
  }
}

void run()
