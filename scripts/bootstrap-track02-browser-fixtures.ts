import { createClient } from "@supabase/supabase-js"

export function buildTrack02FixturePlan() {
  return {
    projects: [
      { code: "TRACK01-A", title: "Project A — Gate C Complete" },
      { code: "TRACK01-B", title: "Project B — Gate B Incomplete" },
    ],
    subcontractors: [
      { code: "SUB-SHOP", description: "Shop Spool Fabrication Contractor" },
      { code: "SUB-FIELD", description: "Field Erection & Assembly Contractor" },
    ],
    materialTypes: [
      { code: "CS-A106B", description: "Carbon Steel A106 Gr B" },
    ],
    serviceClasses: [
      { code: "SC-A1", description: "Process Steam Service Class A1", materialTypeCode: "CS-A106B" },
    ],
    weldTypes: [
      { code: "BW", description: "Butt Weld", countsInDiaInch: true },
      { code: "SW", description: "Socket Weld", countsInDiaInch: true },
    ],
  }
}

export function isLocalhost(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr)
    return ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)
  } catch {
    return false
  }
}

async function runBootstrap() {
  const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54321"
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!isLocalhost(supabaseUrl)) {
    console.error(`ERROR: Track 02 browser fixtures can only run against localhost. Got: ${supabaseUrl}`)
    process.exit(1)
  }

  if (!serviceKey) {
    console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required.")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const plan = buildTrack02FixturePlan()
  console.log("Starting Track 02 browser fixtures bootstrap...")

  // Ensure Project A exists
  const { data: projA } = await supabase
    .from("projects")
    .select("id, activity_code")
    .eq("activity_code", "TRACK01-A")
    .maybeSingle()

  if (!projA) {
    console.error("ERROR: Project TRACK01-A not found. Please run Track 01 bootstrap first.")
    process.exit(1)
  }

  console.log(`Verified Project TRACK01-A (ID: ${projA.id})`)
  console.log("Track 02 browser fixtures completed successfully!")
}

if (require.main === module) {
  runBootstrap().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
