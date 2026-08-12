const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

export function assertLocalSupabaseTarget(value: string): URL {
  let target: URL

  try {
    target = new URL(value)
  } catch {
    throw new Error("A valid local Supabase URL is required.")
  }

  const exactOrigin =
    target.pathname === "/" && target.search === "" && target.hash === ""
  const exactRawOrigin = value === target.origin
  const noCredentials = target.username === "" && target.password === ""
  const hostname = target.hostname.replace(/^\[|\]$/g, "")

  if (
    target.protocol !== "http:" ||
    !LOCAL_HOSTS.has(hostname) ||
    !exactOrigin ||
    !exactRawOrigin ||
    !noCredentials
  ) {
    throw new Error(
      "Demo preparation requires an exact local Supabase HTTP origin.",
    )
  }

  return target
}
