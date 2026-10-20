// The public demo stand on the KZ server: its own Supabase stack (/opt/supabase-demo), separate from
// the one behind app.piping-qc-work.shop. Anyone can open it, so only example projects live there.
export const PIPEQC_PUBLIC_DEMO_ORIGIN = "https://demo.piping-qc-work.shop"

export function assertPublicDemoSupabaseTarget(value: string): URL {
  let target: URL

  try {
    target = new URL(value)
  } catch {
    throw new Error("A configured PipeQC public demo URL is required.")
  }

  const exactOrigin =
    target.pathname === "/" && target.search === "" && target.hash === ""
  const exactRawOrigin = value === target.origin
  const noCredentials = target.username === "" && target.password === ""

  if (
    target.protocol !== "https:" ||
    target.origin !== PIPEQC_PUBLIC_DEMO_ORIGIN ||
    !exactOrigin ||
    !exactRawOrigin ||
    !noCredentials
  ) {
    throw new Error(
      "Example projects can only be loaded into the configured PipeQC public demo origin.",
    )
  }

  return target
}
