/** @type {import('next').NextConfig} */
const nextConfig = {
  // docs/qa/local-supabase-browser-runbook.md offers 127.0.0.1 and localhost as
  // equivalent, but Next.js blocks 127.0.0.1 as a cross-origin dev resource, the HMR
  // socket fails and the app never leaves "Loading PipeQC…".
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
