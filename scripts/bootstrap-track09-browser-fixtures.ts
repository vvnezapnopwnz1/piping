import { createClient } from "@supabase/supabase-js"

export const TRACK09_PROJECT_CODE = "TRACK01-A"
export const TRACK09_PREFIX = "T9-"
export const TRACK09_TORQUE_CODE = "T9-TORQUE-150"
export const TRACK09_JOINTER_CODES = ["T9-J-01", "T9-J-02"] as const

export function isLocalhost(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === "localhost" || host === "127.0.0.1"
  } catch { return false }
}

export function buildTrack09FixturePlan(projectId: string) {
  return {
    projectId,
    category: { project_id: projectId, joint_definition: "Flange", timing: "before_pressure_test", category_code: "T9-X", reason: "Track 09 demo", coefficient: 0.5, status: "active" as const },
    unitTime: { project_id: projectId, activity: "FLANGE_JOINTING", project_ut: 10, standard_reference: "T9-STD" },
    jointers: TRACK09_JOINTER_CODES.map((code) => ({ project_id: projectId, team_type: "jointer" as const, code, description: `${TRACK09_PREFIX}${code} demo jointer`, status: "active" as const })),
  }
}

async function run(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!isLocalhost(url)) throw new Error("Refusing to run against a non-local Supabase URL.")
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required and must be supplied out of band.")

  const client = createClient(url, serviceKey)
  const { data: project, error: projectError } = await client.from("projects").select("id").eq("activity_code", TRACK09_PROJECT_CODE).single()
  if (projectError || !project) throw new Error(`Project ${TRACK09_PROJECT_CODE} was not found. Run the earlier Track 01–04 fixture bootstraps first.`)
  const plan = buildTrack09FixturePlan(project.id)

  const { error: categoryError } = await client.from("project_joint_categories").upsert(plan.category, { onConflict: "project_id,category_code,reason" })
  if (categoryError) throw new Error(categoryError.message)
  const { error: unitError } = await client.from("project_unit_time_references").upsert(plan.unitTime, { onConflict: "project_id,activity" })
  if (unitError) throw new Error(unitError.message)
  const { error: teamError } = await client.from("project_teams").upsert(plan.jointers, { onConflict: "project_id,team_type,code" })
  if (teamError) throw new Error(teamError.message)

  const { data: requirement } = await client.from("system_reference_entries").select("id").eq("kind", "torquing_requirement").eq("code", TRACK09_TORQUE_CODE).maybeSingle()
  if (!requirement) {
    const { error } = await client.from("system_reference_entries").insert({ kind: "torquing_requirement", code: TRACK09_TORQUE_CODE, description: "Track 09 torque 150#" })
    if (error) throw new Error(error.message)
  }
  const { data: utRule } = await client.from("system_ut_calculation_rules").select("id").eq("diameter_from_inch", 2).eq("diameter_to_inch", 8).eq("flange_rating", "150#").maybeSingle()
  if (!utRule) {
    const { error } = await client.from("system_ut_calculation_rules").insert({ diameter_from_inch: 2, diameter_to_inch: 8, flange_rating: "150#", coefficient_diameter: 2, coefficient_rating: 3 })
    if (error) throw new Error(error.message)
  }

  const { data: isometrics } = await client.from("isometrics").select("id").eq("project_id", project.id).like("iso_number", "ISO-T4-%")
  const isoIds = (isometrics ?? []).map((row) => row.id)
  const { data: accepted } = isoIds.length ? await client.from("isometric_revisions").select("id").in("isometric_id", isoIds).eq("status", "accepted") : { data: [] }
  const revisionIds = (accepted ?? []).map((row) => row.id)
  const { data: spoolRevs } = revisionIds.length ? await client.from("spool_revisions").select("id").in("isometric_revision_id", revisionIds) : { data: [] }
  const spoolRevIds = (spoolRevs ?? []).map((row) => row.id)
  const { data: flangeRows } = spoolRevIds.length ? await client.from("flange_joint_revisions").select("id").in("spool_revision_id", spoolRevIds).eq("is_removed", false).limit(3) : { data: [] }
  if ((flangeRows ?? []).length < 1) throw new Error("No Track 04 flange definitions found. Import the approved bolt.txt fixture before Track 09.")
  console.log(JSON.stringify({ projectId: project.id, torqueRequirement: TRACK09_TORQUE_CODE, jointers: TRACK09_JOINTER_CODES, acceptedFlangeDefinitions: (flangeRows ?? []).length }))
}

if (process.argv[1]?.endsWith("bootstrap-track09-browser-fixtures.ts")) run().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exit(1) })
