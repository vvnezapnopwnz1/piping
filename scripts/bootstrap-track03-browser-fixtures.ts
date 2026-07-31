import { createClient } from "@supabase/supabase-js"

export function isLocalhost(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1"
  } catch {
    return false
  }
}

export interface Track03FixturePlan {
  subcontractors: { project_id: string; code: string; description: string }[]
  serviceClasses: { project_id: string; code: string; description: string; material_type_id?: string }[]
  weldTypes: { project_id: string; code: string; description: string }[]
}

export function buildTrack03FixturePlan(projectId: string, materialTypeId?: string): Track03FixturePlan {
  return {
    subcontractors: [
      { project_id: projectId, code: "SUB-IMP-A", description: "Import fixture subcontractor A" },
      { project_id: projectId, code: "SUB-IMP-B", description: "Import fixture subcontractor B" },
    ],
    serviceClasses: [
      {
        project_id: projectId,
        code: "SC-IMP-1",
        description: "Import fixture service class 1",
        ...(materialTypeId ? { material_type_id: materialTypeId } : {}),
      },
      {
        project_id: projectId,
        code: "SC-IMP-2",
        description: "Import fixture service class 2",
        ...(materialTypeId ? { material_type_id: materialTypeId } : {}),
      },
    ],
    weldTypes: [
      { project_id: projectId, code: "WT-IMP-BW", description: "Butt weld" },
      { project_id: projectId, code: "WT-IMP-SW", description: "Socket weld" },
    ],
  }
}

export function planInsertCount(plan: Track03FixturePlan): number {
  return plan.subcontractors.length + plan.serviceClasses.length + plan.weldTypes.length
}

async function runBootstrap(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

  if (!isLocalhost(url)) {
    throw new Error("Refusing to run against a non-local Supabase URL.")
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required and must be supplied out of band.")
  }

  const client = createClient(url, serviceRoleKey)

  const { data: project, error: projectError } = await client
    .from("projects")
    .select("id")
    .eq("activity_code", "TRACK01-A")
    .maybeSingle()

  if (projectError) throw new Error(projectError.message)
  if (!project) {
    throw new Error("Project TRACK01-A was not found. Run the Track 01 bootstrap first.")
  }

  let { data: matType } = await client
    .from("system_reference_entries")
    .select("id")
    .eq("kind", "material_type")
    .limit(1)
    .maybeSingle()

  if (!matType) {
    const { data: newMat, error: matError } = await client
      .from("system_reference_entries")
      .upsert(
        { kind: "material_type", code: "CS", description: "Carbon Steel" },
        { onConflict: "kind,code" }
      )
      .select("id")
      .single()
    if (matError) throw new Error(`system_reference_entries: ${matError.message}`)
    matType = newMat
  }

  const plan = buildTrack03FixturePlan(project.id, matType?.id)
  let written = 0

  const upsert = async (table: string, rows: Record<string, unknown>[]) => {
    const { error } = await client
      .from(table)
      .upsert(rows, { onConflict: "project_id,code", ignoreDuplicates: false })
    if (error) throw new Error(`${table}: ${error.message}`)
    written += rows.length
  }

  await upsert("project_subcontractors", plan.subcontractors)
  await upsert("project_service_classes", plan.serviceClasses)
  await upsert("project_weld_types", plan.weldTypes)

  console.log(`Track 03 fixtures reconciled: ${written} rows upserted into project ${project.id}.`)
}

const invokedDirectly = process.argv[1]?.endsWith("bootstrap-track03-browser-fixtures.ts")
if (invokedDirectly) {
  runBootstrap().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
