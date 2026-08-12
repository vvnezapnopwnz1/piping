import { createClient } from "@supabase/supabase-js"

export const TRACK08_PROJECT_CODE = "TRACK01-A"
export const TRACK08_ISO = "ISO-T8-001"
export const TRACK08_SPOOLS = {
  active: "SP-T8-ACTIVE",
  transit: "SP-T8-TRANSIT",
  overdue: "SP-T8-OVERDUE",
  erected: "SP-T8-ERECTED",
} as const

const IDS = {
  iso: "88000000-0000-4000-8000-000000000001",
  isoRevision: "88100000-0000-4000-8000-000000000001",
  spools: ["88200000-0000-4000-8000-000000000001", "88200000-0000-4000-8000-000000000002", "88200000-0000-4000-8000-000000000003", "88200000-0000-4000-8000-000000000004"],
  revisions: ["88300000-0000-4000-8000-000000000001", "88300000-0000-4000-8000-000000000002", "88300000-0000-4000-8000-000000000003", "88300000-0000-4000-8000-000000000004"],
  category: "88400000-0000-4000-8000-000000000001",
  locations: ["88500000-0000-4000-8000-000000000001", "88500000-0000-4000-8000-000000000002", "88500000-0000-4000-8000-000000000003"],
  devices: ["88600000-0000-4000-8000-000000000001", "88600000-0000-4000-8000-000000000002"],
  assignment: "88700000-0000-4000-8000-000000000001",
} as const

export function isLocalhost(value: string): boolean {
  try { return ["localhost", "127.0.0.1"].includes(new URL(value).hostname) } catch { return false }
}

export function buildTrack08FixturePlan(projectId: string, adminId: string, operatorMembershipId: string, pdsAreaId: string | null) {
  return {
    eventTimes: ["2026-08-01T08:00:00Z", "2026-08-01T09:00:00Z", "2026-08-02T10:00:00Z"],
    category: { id: IDS.category, project_id: projectId, code: "T8-YARD", description: "Track 08 storage" },
    locations: [
      { id: IDS.locations[0], project_id: projectId, category_id: IDS.category, code: "T8-YARD-A", description: "Track 08 Yard A", capacity: 2 },
      { id: IDS.locations[1], project_id: projectId, category_id: IDS.category, code: "T8-YARD-B", description: "Track 08 Yard B", capacity: 10 },
      { id: IDS.locations[2], project_id: projectId, category_id: IDS.category, code: "T8-LEGACY", description: "Track 08 legacy location", capacity: null },
    ],
    devices: [
      { id: IDS.devices[0], project_id: projectId, code: "PDA-T8-01", description: "Assigned Track 08 PDA" },
      { id: IDS.devices[1], project_id: projectId, code: "PDA-T8-UNASSIGNED", description: "Unassigned Track 08 PDA" },
    ],
    assignment: { id: IDS.assignment, project_id: projectId, membership_id: operatorMembershipId, device_id: IDS.devices[0], status: "active" as const },
    isometric: { id: IDS.iso, project_id: projectId, iso_number: TRACK08_ISO },
    isometricRevision: { id: IDS.isoRevision, isometric_id: IDS.iso, revision_number: "R0", revision_ordinal: 1, status: "accepted" as const, pds_area_id: pdsAreaId, created_by: adminId, accepted_at: "2026-08-01T07:00:00Z" },
    spools: Object.values(TRACK08_SPOOLS).map((spool_number, index) => ({ id: IDS.spools[index], project_id: projectId, spool_number })),
    spoolRevisions: IDS.revisions.map((id, index) => ({ id, spool_id: IDS.spools[index], isometric_revision_id: IDS.isoRevision, sequence_number: index + 1 })),
  }
}

async function run(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!isLocalhost(url)) throw new Error("Refusing to run Track 08 fixtures against a non-local Supabase URL.")
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required and must be supplied out of band.")
  const client = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: project, error: projectError } = await client.from("projects").select("id").eq("activity_code", TRACK08_PROJECT_CODE).single()
  if (projectError || !project) throw new Error(`Project ${TRACK08_PROJECT_CODE} was not found. Run prerequisite Track fixtures first.`)
  const { data: admin, error: adminError } = await client.from("profiles").select("id").eq("email", "track01.project-admin-a@example.test").single()
  if (adminError || !admin) throw new Error("Required project administrator profile was not found. Run Track 01 first.")
  const adminId = admin.id as string
  const { data: operator, error: operatorError } = await client.from("profiles").select("id").eq("email", "track01.qc-editor@example.test").single()
  if (operatorError || !operator) throw new Error("Required QC Editor profile was not found. Run Track 01 first.")
  const { data: operatorMembership, error: membershipError } = await client.from("project_memberships").select("id").eq("project_id", project.id).eq("user_id", operator.id).single()
  if (membershipError || !operatorMembership) throw new Error("Required Track 01 project membership was not found.")
  const operatorMembershipId = operatorMembership.id as string
  const { error: roleError } = await client.from("project_membership_functional_roles").upsert({ membership_id: operatorMembershipId, role_code: "tracking_operator" }, { onConflict: "membership_id,role_code" })
  if (roleError) throw new Error(roleError.message)
  const { data: pdsArea } = await client.from("project_pds_areas").select("id").eq("project_id", project.id).order("code").limit(1).maybeSingle()
  const plan = buildTrack08FixturePlan(project.id, adminId, operatorMembershipId, pdsArea?.id ?? null)
  const categoryRes = await client.from("project_location_categories").upsert(plan.category, { onConflict: "project_id,code" })
  if (categoryRes.error) throw new Error(categoryRes.error.message)
  const locRes = await client.from("project_locations").upsert(plan.locations, { onConflict: "project_id,code" })
  if (locRes.error) throw new Error(locRes.error.message)
  const devRes = await client.from("project_devices").upsert(plan.devices, { onConflict: "project_id,code" })
  if (devRes.error) throw new Error(devRes.error.message)
  const assignRes = await client.from("project_device_users").upsert(plan.assignment, { onConflict: "project_id,membership_id" })
  if (assignRes.error) throw new Error(assignRes.error.message)
  const isoRes = await client.from("isometrics").upsert(plan.isometric, { onConflict: "project_id,iso_number" })
  if (isoRes.error) throw new Error(isoRes.error.message)
  const revisionWrites = [
    client.from("isometric_revisions").upsert(plan.isometricRevision, { onConflict: "isometric_id,revision_number" }),
    client.from("spools").upsert(plan.spools, { onConflict: "project_id,spool_number" }),
  ]
  for (const result of await Promise.all(revisionWrites)) if (result.error) throw new Error(result.error.message)
  const { error: spoolRevisionError } = await client.from("spool_revisions").upsert(plan.spoolRevisions, { onConflict: "isometric_revision_id,spool_id" })
  if (spoolRevisionError) throw new Error(spoolRevisionError.message)
  const { data: existingStages } = await client.from("construction_progress_events").select("id").eq("project_id", project.id).contains("payload", { fixture: "track08" })
  if ((existingStages ?? []).length === 0) {
    const stageRows = plan.spoolRevisions.map((row) => ({ project_id: project.id, spool_revision_id: row.id, phase: "fabrication", stage: "start_fab", occurred_on: "2026-08-01", payload: { fixture: "track08" }, actor_id: adminId }))
    stageRows.push({ project_id: project.id, spool_revision_id: plan.spoolRevisions[3].id, phase: "erection", stage: "erected", occurred_on: "2026-08-02", payload: { fixture: "track08" }, actor_id: adminId })
    const { error } = await client.from("construction_progress_events").insert(stageRows)
    if (error) throw new Error(error.message)
  }
  const record = async (spoolIndex: number, locationIndex: number, direction: "in" | "out" | "manual", occurredAt: string, key: string, source: "manual" | "compensation" = "manual", target: string | null = null, reason: string | null = null) => {
    const { data, error } = await client.rpc("record_location_event_invariant" as never, { p_project_id: project.id, p_spool_id: plan.spools[spoolIndex].id, p_location_id: plan.locations[locationIndex].id, p_device_id: IDS.devices[0], p_direction: direction, p_occurred_at: occurredAt, p_reason: reason, p_compensates_event_id: target, p_source: source, p_source_import_job_id: null, p_operator_membership_id: operatorMembershipId, p_recorded_by: adminId, p_source_event_key: key } as never)
    if (error) throw new Error(error.message)
    return (data as { id: string }).id
  }
  const activeInitial = await record(0, 0, "in", plan.eventTimes[0], "track08-active-in")
  await record(0, 1, "manual", plan.eventTimes[2], "track08-active-correction", "compensation", activeInitial, "Correct demo yard assignment")
  await record(1, 0, "in", "2026-08-08T09:00:00Z", "track08-transit-in")
  await record(1, 0, "out", "2026-08-08T10:00:00Z", "track08-transit-out")
  await record(2, 1, "in", "2026-07-20T08:00:00Z", "track08-overdue-in")
  await record(2, 1, "out", "2026-07-20T09:00:00Z", "track08-overdue-out")
  await record(3, 2, "in", plan.eventTimes[2], "track08-erected-in")
  console.log(JSON.stringify({ project: TRACK08_PROJECT_CODE, iso: TRACK08_ISO, spools: TRACK08_SPOOLS, scanFile: "scripts/tracking-scans.txt" }))
}

if (process.argv[1]?.endsWith("bootstrap-track08-browser-fixtures.ts")) run().catch((cause: unknown) => { console.error(cause instanceof Error ? cause.message : cause); process.exit(1) })
