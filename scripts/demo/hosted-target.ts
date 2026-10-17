// The self-hosted Supabase on the KZ server (hoster.kz) is the only hosted PipeQC stand.
// The former cloud project lmjkqcdmxehknipeoeye is frozen and must not be targeted.
export const PIPEQC_HOSTED_DEMO_ORIGIN = "https://supabase.piping-qc-work.shop"

export function assertHostedSupabaseTarget(value: string): URL {
  let target: URL

  try {
    target = new URL(value)
  } catch {
    throw new Error("A configured PipeQC hosted demo URL is required.")
  }

  const exactOrigin =
    target.pathname === "/" && target.search === "" && target.hash === ""
  const exactRawOrigin = value === target.origin
  const noCredentials = target.username === "" && target.password === ""

  if (
    target.protocol !== "https:" ||
    target.origin !== PIPEQC_HOSTED_DEMO_ORIGIN ||
    !exactOrigin ||
    !exactRawOrigin ||
    !noCredentials
  ) {
    throw new Error(
      "Demo preparation requires the configured PipeQC hosted demo origin.",
    )
  }

  return target
}
