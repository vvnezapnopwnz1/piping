import { createClient } from "@supabase/supabase-js"
import { signInFixtureOperator } from "./spoolgen-fixture-import"

export const TRACK10_PROJECT_CODE = "TRACK01-A"
export const TRACK10_TEST_PACK_NUMBER = "TP-T10-001"
export const TRACK10_BLOCKED_TEST_PACK_NUMBER = "TP-T10-BLOCKED"
export const TRACK10_PUNCH_CODE = "P-T10-001"
export const TRACK10_TEAM_CODES = { lineCheck: "T10-LC-01", finishing: "T10-FIN-01", blinding: "T10-BL-01", reinstatement: "T10-RI-01", jointer: "T10-J-01" } as const
export const TRACK10_READ_ONLY_EMAIL = "track01.reader-qc@example.test"

export function isLocalhost(url: string): boolean {
  try { const hostname = new URL(url).hostname; return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" } catch { return false }
}

export function buildTrack10FixturePlan(projectId: string, blockedIsometricId: string) {
  return {
    blockedTestPack: { project_id: projectId, test_pack_number: TRACK10_BLOCKED_TEST_PACK_NUMBER, lifecycle: "active" as const },
    blockedMember: { project_id: projectId, isometric_id: blockedIsometricId, source_kind: "manual" as const },
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

export function buildTrack10ReadOnlyMembershipPlan(projectId: string, userId: string) {
  return {
    membership: { project_id: projectId, user_id: userId, role: "project_manager", access_role_code: "project_reader", is_active: true },
    functionalRoles: ["qc_engineer"],
  }
}

type Track10ReadinessCandidate = { isometric_id: string | null; is_rft: boolean | null; blocker_counts: unknown }

function isLineCheckOnlyBlocked(blockers: unknown): boolean {
  if (!blockers || typeof blockers !== "object" || Array.isArray(blockers)) return false
  const entries = Object.entries(blockers as Record<string, unknown>)
  return entries.some(([code, count]) => code === "LINE_CHECK_PENDING" && Number(count) > 0)
    && entries.every(([code, count]) => code === "LINE_CHECK_PENDING" || Number(count) === 0)
}

export function pickTrack10Isometrics(rows: readonly Track10ReadinessCandidate[]) {
  const mainIsometricId = rows.find((row) => !row.is_rft && row.isometric_id && isLineCheckOnlyBlocked(row.blocker_counts))?.isometric_id
  const blockedIsometricId = rows.find((row) => !row.is_rft && row.isometric_id && !isLineCheckOnlyBlocked(row.blocker_counts))?.isometric_id
  return { mainIsometricId, blockedIsometricId }
}

async function run(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""
  const fixturePassword = process.env.TRACK01_FIXTURE_PASSWORD ?? ""
  if (!isLocalhost(url)) throw new Error("Refusing to run against a non-local Supabase URL.")
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required and must be supplied out of band.")
  if (!publishableKey || !fixturePassword) throw new Error("SUPABASE_PUBLISHABLE_KEY and TRACK01_FIXTURE_PASSWORD are required out of band.")
  const client = createClient(url, serviceRoleKey)
  const operator = await signInFixtureOperator(url, publishableKey, fixturePassword)
  const { data: project, error: projectError } = await client.from("projects").select("id").eq("activity_code", TRACK10_PROJECT_CODE).maybeSingle()
  if (projectError) throw new Error(projectError.message)
  if (!project) throw new Error(`Project ${TRACK10_PROJECT_CODE} was not found. Run Track 01–09 fixture bootstraps first.`)
  const projectId = project.id
  const [{ data: secondaryProject, error: secondaryProjectError }, { data: readOnlyUser, error: readOnlyUserError }] = await Promise.all([
    client.from("projects").select("id").eq("activity_code", "TRACK01-B").maybeSingle(),
    client.from("profiles").select("id").eq("email", TRACK10_READ_ONLY_EMAIL).maybeSingle(),
  ])
  if (secondaryProjectError || !secondaryProject) throw new Error(secondaryProjectError?.message ?? "Project TRACK01-B was not found. Run Track 01 browser fixtures first.")
  if (readOnlyUserError || !readOnlyUser) throw new Error(readOnlyUserError?.message ?? `Read-only fixture user ${TRACK10_READ_ONLY_EMAIL} was not found.`)
  const readOnlyPlan = buildTrack10ReadOnlyMembershipPlan(secondaryProject.id, readOnlyUser.id)
  const { data: readOnlyMembership, error: readOnlyMembershipError } = await client.from("project_memberships").upsert(readOnlyPlan.membership, { onConflict: "project_id,user_id" }).select("id").single()
  if (readOnlyMembershipError || !readOnlyMembership) throw new Error(readOnlyMembershipError?.message ?? "Read-only fixture membership was not written.")
  const { error: clearReadOnlyRolesError } = await client.from("project_membership_functional_roles").delete().eq("membership_id", readOnlyMembership.id)
  if (clearReadOnlyRolesError) throw new Error(clearReadOnlyRolesError.message)
  const { error: insertReadOnlyRolesError } = await client.from("project_membership_functional_roles").insert(readOnlyPlan.functionalRoles.map((role_code) => ({ membership_id: readOnlyMembership.id, role_code })))
  if (insertReadOnlyRolesError) throw new Error(insertReadOnlyRolesError.message)
  const [{ data: systems }, { data: subsystems }, { data: serviceClasses }, { data: lineServices }, { data: pressureUnit }] = await Promise.all([
    operator.from("project_systems").select("id").eq("project_id", projectId).eq("status", "active").limit(1),
    operator.from("project_subsystems").select("id").eq("project_id", projectId).eq("status", "active").limit(1),
    operator.from("project_service_classes").select("id").eq("project_id", projectId).eq("status", "active").limit(1),
    operator.from("project_line_services").select("id").eq("project_id", projectId).eq("status", "active").limit(1),
    operator.from("project_pressure_units").select("unit").eq("project_id", projectId).maybeSingle(),
  ])
  const { data: readiness, error: readinessError } = await operator.from("isometric_readiness").select("isometric_id, is_rft, blocker_counts").eq("project_id", projectId).not("isometric_id", "is", null).order("isometric_id")
  if (readinessError) throw new Error(readinessError.message)
  let systemId = systems?.[0]?.id; let subsystemId = subsystems?.[0]?.id; const serviceClassId = serviceClasses?.[0]?.id; const lineServiceId = lineServices?.[0]?.id; let unit = pressureUnit?.unit
  if (!systemId) { const created = await operator.from("project_systems").upsert({ project_id: projectId, code: "T10-SYS", description: "Track 10 browser system", status: "active" }, { onConflict: "project_id,code" }).select("id").single(); if (created.error || !created.data) throw new Error(created.error?.message ?? "Track 10 system fixture was not written."); systemId = created.data.id }
  if (!subsystemId) { const created = await operator.from("project_subsystems").upsert({ project_id: projectId, system_id: systemId, code: "T10-SUB", description: "Track 10 browser subsystem", status: "active" }, { onConflict: "project_id,code" }).select("id").single(); if (created.error || !created.data) throw new Error(created.error?.message ?? "Track 10 subsystem fixture was not written."); subsystemId = created.data.id }
  if (!unit) { const created = await operator.from("project_pressure_units").upsert({ project_id: projectId, unit: "bar" }, { onConflict: "project_id" }).select("unit").single(); if (created.error || !created.data) throw new Error(created.error?.message ?? "Track 10 pressure unit fixture was not written."); unit = created.data.unit }
  const { mainIsometricId, blockedIsometricId } = pickTrack10Isometrics((readiness ?? []) as Track10ReadinessCandidate[])
  if (!systemId || !subsystemId || !serviceClassId || !lineServiceId || !unit || !mainIsometricId || !blockedIsometricId) throw new Error("Track 01–09 prerequisites are incomplete: need active references, one ISO blocked only by Line Check, and one ISO with an upstream blocker.")
  const mainIsoId = mainIsometricId
  const { data: mainRevision, error: mainRevisionError } = await client.from("isometric_revisions").select("id").eq("isometric_id", mainIsoId).eq("status", "accepted").maybeSingle()
  if (mainRevisionError || !mainRevision) throw new Error(mainRevisionError?.message ?? "Main Track 10 ISO has no accepted revision.")
  const { data: mainSpoolRevision, error: mainSpoolRevisionError } = await client.from("spool_revisions").select("id").eq("isometric_revision_id", mainRevision.id).limit(1).maybeSingle()
  if (mainSpoolRevisionError || !mainSpoolRevision) throw new Error(mainSpoolRevisionError?.message ?? "Main Track 10 ISO has no spool revision.")
  const { data: torque, error: torqueError } = await client.from("system_reference_entries").upsert({ kind: "torquing_requirement", code: "T10-TORQUE", description: "Track 10 browser torque" }, { onConflict: "kind,code" }).select("id").single()
  if (torqueError || !torque) throw new Error(torqueError?.message ?? "Track 10 torque fixture was not written.")
  for (const fixture of [{ code: "Y", timing: "before_precommissioning" }, { code: "Z", timing: "after_precommissioning" }] as const) {
    const category = await client.from("project_joint_categories").upsert({ project_id: projectId, joint_definition: "Flange", timing: fixture.timing, category_code: fixture.code, reason: "Track 10 browser fixture", coefficient: 0.5, status: "active" }, { onConflict: "project_id,category_code,reason" }).select("id").single()
    if (category.error || !category.data) throw new Error(category.error?.message ?? `Track 10 ${fixture.code} category was not written.`)
    const joint = await client.from("flange_joints").upsert({ project_id: projectId, flange_number: `T10-${fixture.code}-001` }, { onConflict: "project_id,flange_number" }).select("id").single()
    if (joint.error || !joint.data) throw new Error(joint.error?.message ?? `Track 10 ${fixture.code} flange was not written.`)
    const revision = await client.from("flange_joint_revisions").upsert({ flange_joint_id: joint.data.id, spool_revision_id: mainSpoolRevision.id, flange_rating: "150#", diameter_inch: 6 }, { onConflict: "spool_revision_id,flange_joint_id" }).select("id").single()
    if (revision.error || !revision.data) throw new Error(revision.error?.message ?? `Track 10 ${fixture.code} flange revision was not written.`)
    const { data: existingProgress, error: existingProgressError } = await client.from("flange_progress_records").select("id").eq("flange_joint_revision_id", revision.data.id).is("superseded_at", null).maybeSingle()
    if (existingProgressError) throw new Error(existingProgressError.message)
    if (!existingProgress) { const progress = await client.from("flange_progress_records").insert({ project_id: projectId, flange_joint_revision_id: revision.data.id, joint_category_id: category.data.id, torquing_requirement_id: torque.id, jointing_method_snapshot: "T10-TORQUE", jointing_value: 100, joint_date: new Date().toISOString().slice(0, 10), report_number: `T10-${fixture.code}-REPORT`, tag_number: `T10-${fixture.code}-TAG`, source_kind: "manual", ut_project_quantity: 10, ut_coefficient_diameter: 2, ut_coefficient_rating: 3, ut_coefficient_punch: 0.5, calculated_ut: 30 }); if (progress.error) throw new Error(progress.error.message) }
  }
  const { data: flangeFacts, error: flangeError } = await operator.from("flange_joint_readiness").select("category_code, effective_progress_id").eq("isometric_id", mainIsoId).eq("requires_reinstatement", true)
  if (flangeError) throw new Error(flangeError.message)
  const effectiveCategories = new Set((flangeFacts ?? []).filter((row) => row.effective_progress_id).map((row) => row.category_code))
  if (!effectiveCategories.has("Y") || !effectiveCategories.has("Z")) throw new Error("Track 10 Y/Z fixture graph was not readable through the authenticated view.")
  const plan = buildTrack10FixturePlan(projectId, blockedIsometricId)
  const teams = await client.from("project_teams").upsert(plan.teams, { onConflict: "project_id,team_type,code" }); if (teams.error) throw new Error(teams.error.message)
  const { data: existingPunch } = await client.from("project_punch_codes").select("id").eq("project_id", projectId).ilike("code", TRACK10_PUNCH_CODE).maybeSingle()
  if (!existingPunch) { const punch = await client.from("project_punch_codes").insert(plan.punchCode); if (punch.error) throw new Error(punch.error.message) }
  const { data: existingMain } = await client.from("test_packs").select("id").eq("project_id", projectId).eq("test_pack_number", TRACK10_TEST_PACK_NUMBER).maybeSingle()
  if (existingMain) throw new Error(`${TRACK10_TEST_PACK_NUMBER} already exists. Use a clean fixture database before running the browser walkthrough.`)
  const blockedPack = await client.from("test_packs").upsert({ project_id: projectId, test_pack_number: TRACK10_BLOCKED_TEST_PACK_NUMBER, system_id: systemId, subsystem_id: subsystemId, service_class_id: serviceClassId, line_service_id: lineServiceId, pressure_unit: unit, planned_start_on: "2026-08-05", planned_end_on: "2026-08-31", priority: "High", test_medium: "H", test_pressure: 10, location: "Track 10 blocked browser QA", lifecycle: "active" }, { onConflict: "project_id,test_pack_number" }).select("id").single(); if (blockedPack.error || !blockedPack.data) throw new Error(blockedPack.error?.message ?? "Blocked Test Pack fixture was not written.")
  const revision = await client.from("isometric_revisions").select("id").eq("isometric_id", blockedIsometricId).eq("status", "accepted").maybeSingle(); if (revision.error || !revision.data) throw new Error(revision.error?.message ?? "Blocked ISO has no accepted revision.")
  const { data: existingBlockedMember } = await client.from("test_pack_isometrics").select("id").eq("test_pack_id", blockedPack.data.id).eq("isometric_id", blockedIsometricId).is("removed_at", null).maybeSingle()
  if (!existingBlockedMember) { const membership = await client.from("test_pack_isometrics").insert({ ...plan.blockedMember, test_pack_id: blockedPack.data.id, assigned_isometric_revision_id: revision.data.id }); if (membership.error) throw new Error(membership.error.message) }
  console.log(JSON.stringify({ projectId, testPackNumber: TRACK10_TEST_PACK_NUMBER, mainIsometricId, references: { systemId, subsystemId, serviceClassId, lineServiceId, pressureUnit: unit }, blockedTestPackNumber: TRACK10_BLOCKED_TEST_PACK_NUMBER, blockedIsometricId, punchCode: TRACK10_PUNCH_CODE, teams: Object.values(TRACK10_TEAM_CODES), downstreamResultsSeeded: false }))
}

if (process.argv[1]?.endsWith("bootstrap-track10-browser-fixtures.ts")) run().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exit(1) })
