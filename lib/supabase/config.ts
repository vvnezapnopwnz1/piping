export type SupabasePublicConfig = {
  url: string
  publishableKey: string
}

type PublicEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
}

export function getSupabasePublicConfig(
  environment: PublicEnvironment
): SupabasePublicConfig {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be configured")
  }

  if (!publishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured")
  }

  return { url, publishableKey }
}
