import createNextIntlPlugin from "next-intl/plugin"

// The language comes from a cookie, not from the address; i18n/request.ts resolves it per request.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  // docs/qa/local-supabase-browser-runbook.md offers 127.0.0.1 and localhost as
  // equivalent, but Next.js blocks 127.0.0.1 as a cross-origin dev resource, the HMR
  // socket fails and the app never leaves "Loading PipeQC…".
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    unoptimized: true,
  },
  // AGENTS.md is the project's own instructions; next dev would append its own block on every run.
  agentRules: false,
}

export default withNextIntl(nextConfig)

