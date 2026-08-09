import { createClient } from "@supabase/supabase-js"

export const TRACK10_PROJECT_CODE = "TRACK01-A"
export const TRACK10_TEST_PACK_NUMBER = "TP-T10-001"
export const TRACK10_BLOCKED_TEST_PACK_NUMBER = "TP-T10-BLOCKED"
export const TRACK10_PUNCH_CODE = "P-T10-001"
export const TRACK10_TEAM_CODES = { lineCheck: "T10-LC-01", finishing: "T10-FIN-01", blinding: "T10-BL-01", reinstatement: "T10-RI-01", jointer: "T10-J-01" } as const

export function isLocalhost(url: string): boolean {
  try { const hostname = new URL(url).hostname; return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" } catch { return false }
}

export function buildTrack10FixturePlan(projectId: string, isometricIds: string[]) {
  return {
    testPack: { project_id: projectId, test_pack_number: TRACK10_TEST_PACK_NUMBER, lifecycle: "active" as const },
    isometricIds: [...isometricIds],
    punchCode: { project_id: projectId, code: TRACK10_PUNCH_CODE, description: "Track 10 browser Category X line-check punch", status: "active" as const },
    teams: [
      { project_id: projectId, team_type: "line_check" as const, code: TRACK10_TEAM_CODES.lineCheck, description: "Track 10 line-check team", status: "active" as const },
      { project_id: projectId, team_type: "finishing" as const, code: TRACK10_TEAM_CODES.finishing, description: "Track 10 finishing team", status: "active" as const },
      { project_id: projectId, team_type: "blinding" as const, code: TRACK10_TEAM_CODES.blinding, description: "Track 10 blinding team", status: "active" as const },
      { project_id: projectId, team_type: "reinstatement" as const, code: TRACK10_TEAM_CODES.reinstatement, description: "Track 10 reinstatement team", status: "active" as const },
      { project_id: projectId, team_type: "jointer" as const, code: TRACK10_TEAM_CODES.jointer, description: "Track 10 jointer team", status: "active" as const },
    ],
  }
}

async function run(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!isLocalhost(url)) throw new Error("Refusing to run against a non-local Supabase URL.")
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required and must be supplied out of band.")
  const client = createClient(url, serviceRoleKey)
  const { data: project, error: projectError } = await client.from("projects").select("id").eq("activity_code", TRACK10_PROJECT_CODE).maybeSingle()
  if (projectError) throw new Error(projectError.message)
  if (!project) throw new Error(`Project ${TRACK10_PROJECT_CODE} was not found. Run Track 01–09 fixture bootstraps first.`)
  const projectId = project.id
  const [{ data: systems }, { data: subsystems }, { data: serviceClasses }, { data: lineServices }, { data: pressureUnit }, { data: readiness }] = await Promise.all([
    client.from("project_systems").select("id").eq("project_id", projectId).eq("status", "active").limit(1),
    client.from("project_subsystems").select("id").eq("project_id", projectId).eq("status", "active").limit(1),
    client.from("project_service_classes").select("id").eq("project_id", projectId).eq("status", "active").limit(1),
    client.from("project_line_services").select("id").eq("project_id", projectId).eq("status", "active").limit(1),
    client.from("project_pressure_units").select("unit").eq("project_id", projectId).maybeSingle(),
    client.from("isometric_readiness").select("isometric_id, is_rft").eq("project_id", projectId).not("isometric_id", "is", null).limit(2),
  ])
  const systemId = systems?.[0]?.id; const subsystemId = subsystems?.[0]?.id; const serviceClassId = serviceClasses?.[0]?.id; const lineServiceId = lineServices?.[0]?.id; const unit = pressureUnit?.unit; const isometricIds = (readiness ?? []).map((row) => row.isometric_id).filter((id): id is string => Boolean(id))
  if (!systemId || !subsystemId || !serviceClassId || !lineServiceId || !unit || isometricIds.length < 2) throw new Error("Track 01–09 prerequisites are incomplete: need active references, one pressure unit, and two accepted ISO readiness rows.")
  const { data: flangeFacts, error: flangeError } = await client.from("flange_joint_readiness").select("isometric_id, category_code, effective_progress_id, requires_reinstatement").in("isometric_id", isometricIds).eq("requires_reinstatement", true)
  if (flangeError) throw new Error(flangeError.message)
  const effectiveCategories = new Set((flangeFacts ?? []).filter((row) => row.effective_progress_id).map((row) => row.category_code))
  if (!effectiveCategories.has("Y") || !effectiveCategories.has("Z")) throw new Error("Track 09 prerequisite is incomplete: selected ISO fixture graph must have completed current Y and Z flange progress.")
  const plan = buildTrack10FixturePlan(projectId, isometricIds)
  const teams = await client.from("project_teams").upsert(plan.teams, { onConflict: "project_id,team_type,code" }); if (teams.error) throw new Error(teams.error.message)
  const { data: existingPunch } = await client.from("project_punch_codes").select("id").eq("project_id", projectId).ilike("code", TRACK10_PUNCH_CODE).maybeSingle()
  if (!existingPunch) { const punch = await client.from("project_punch_codes").insert(plan.punchCode); if (punch.error) throw new Error(punch.error.message) }
  const pack = await client.from("test_packs").upsert({ project_id: projectId, test_pack_number: TRACK10_TEST_PACK_NUMBER, system_id: systemId, subsystem_id: subsystemId, service_class_id: serviceClassId, line_service_id: lineServiceId, pressure_unit: unit, planned_start_on: "2026-08-05", planned_end_on: "2026-08-31", priority: "High", test_medium: "H", test_pressure: 10, location: "Track 10 browser QA", lifecycle: "active" }, { onConflict: "project_id,test_pack_number" }).select("id").single(); if (pack.error || !pack.data) throw new Error(pack.error?.message ?? "Test Pack fixture was not written.")
  const revisions = await client.from("isometric_revisions").select("id, isometric_id").in("isometric_id", isometricIds).eq("status", "accepted"); if (revisions.error) throw new Error(revisions.error.message)
  const members = (revisions.data ?? []).map((revision) => ({ project_id: projectId, test_pack_id: pack.data.id, isometric_id: revision.isometric_id, assigned_isometric_revision_id: revision.id, source_kind: "manual" as const })).slice(0, 2)
  const { data: existingMembers } = await client.from("test_pack_isometrics").select("isometric_id").eq("test_pack_id", pack.data.id).is("removed_at", null)
  const existingIds = new Set((existingMembers ?? []).map((member) => member.isometric_id))
  const missingMembers = members.filter((member) => !existingIds.has(member.isometric_id))
  if (missingMembers.length) { const membership = await client.from("test_pack_isometrics").insert(missingMembers); if (membership.error) throw new Error(membership.error.message) }
  console.log(JSON.stringify({ projectId, testPackNumber: TRACK10_TEST_PACK_NUMBER, isometricIds, punchCode: TRACK10_PUNCH_CODE, teams: Object.values(TRACK10_TEAM_CODES), downstreamResultsSeeded: false }))
}

if (process.argv[1]?.endsWith("bootstrap-track10-browser-fixtures.ts")) run().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exit(1) })
