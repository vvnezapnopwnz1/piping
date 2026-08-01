import { createClient } from "@supabase/supabase-js"

export const isLocalhost = (url: string): boolean => {
  try {
    return ["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname)
  } catch {
    return false
  }
}

export interface Track05FixturePlan {
  subcontractors: { project_id: string; code: string; name: string }[]
  weldingProcedures: {
    project_id: string
    subcontractor_id: string
    material_type_id: string
    code: string
    process: string
    diameter_from: number
    diameter_to: number
    thickness_from: number
    thickness_to: number
    revision: string
    approved_on: string
  }[]
  welders: {
    project_id: string
    subcontractor_id: string
    welder_code: string
    full_name: string
    expires_on: string
  }[]
  welderWpsLinks: { welder_code: string; wps_id: string }[]
  pmlRecords: {
    project_id: string
    mrr_number: string
    ident_code: string
    trace_number: string
  }[]
  locations: { project_id: string; code: string; description: string }[]
  paintMatrixRules: { project_id: string; required_final_dft_microns: number }[]
}

/**
 * The referentials a Track 05 walkthrough needs on top of the Track 01–04 fixtures.
 * `materialTypeId` comes from the same system reference entry the Track 04 fixture used, so
 * the WPS material check passes for the imported spools.
 */
export function buildTrack05FixturePlan(
  projectId: string,
  subcontractorId: string,
  materialTypeId: string,
  wpsId: string,
): Track05FixturePlan {
  return {
    subcontractors: [{ project_id: projectId, code: "SUB-T5", name: "Track 05 fabricator" }],
    weldingProcedures: [
      {
        project_id: projectId,
        subcontractor_id: subcontractorId,
        material_type_id: materialTypeId,
        code: "WPS-T5",
        process: "GTAW",
        diameter_from: 1,
        diameter_to: 24,
        thickness_from: 2,
        thickness_to: 30,
        revision: "R0",
        approved_on: "2026-01-01",
      },
    ],
    welders: [
      {
        project_id: projectId,
        subcontractor_id: subcontractorId,
        welder_code: "W-T5-1",
        full_name: "Track 05 welder one",
        expires_on: "2028-01-01",
      },
      {
        project_id: projectId,
        subcontractor_id: subcontractorId,
        welder_code: "W-T5-2",
        full_name: "Track 05 welder two",
        expires_on: "2028-01-01",
      },
    ],
    welderWpsLinks: [
      { welder_code: "W-T5-1", wps_id: wpsId },
      { welder_code: "W-T5-2", wps_id: wpsId },
    ],
    pmlRecords: [
      {
        project_id: projectId,
        mrr_number: "MRR-T5-1",
        ident_code: "IDN-T5-100",
        trace_number: "HEAT-T5-100",
      },
      {
        project_id: projectId,
        mrr_number: "MRR-T5-1",
        ident_code: "IDN-T5-200",
        trace_number: "HEAT-T5-200",
      },
    ],
    locations: [{ project_id: projectId, code: "YARD-T5", description: "Track 05 laydown yard" }],
    paintMatrixRules: [{ project_id: projectId, required_final_dft_microns: 240 }],
  }
}

export const planInsertCount = (plan: Track05FixturePlan): number =>
  plan.subcontractors.length +
  plan.weldingProcedures.length +
  plan.welders.length +
  plan.welderWpsLinks.length +
  plan.pmlRecords.length +
  plan.locations.length +
  plan.paintMatrixRules.length

async function run(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!isLocalhost(url)) throw new Error("Refusing to run against a non-local Supabase URL.")
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required and must be supplied out of band.")
  }

  const client = createClient(url, key)

  const { data: project } = await client
    .from("projects")
    .select("id")
    .eq("activity_code", "TRACK01-A")
    .maybeSingle()
  if (!project) throw new Error("Project TRACK01-A was not found. Run the Track 01 bootstrap first.")

  const { data: material } = await client
    .from("system_reference_entries")
    .select("id")
    .eq("kind", "material_type")
    .limit(1)
    .maybeSingle()
  if (!material) throw new Error("No material_type system reference entry exists.")

  const seed = buildTrack05FixturePlan(project.id, "", material.id, "")

  const subcontractors = await client
    .from("project_subcontractors")
    .upsert(seed.subcontractors, { onConflict: "project_id,code" })
  const locations = await client
    .from("project_locations")
    .upsert(seed.locations, { onConflict: "project_id,code" })
  const pml = await client
    .from("piping_material_records")
    .upsert(seed.pmlRecords, { onConflict: "project_id,ident_code,trace_number" })
  if (subcontractors.error || locations.error || pml.error) {
    throw new Error(
      subcontractors.error?.message ?? locations.error?.message ?? pml.error?.message,
    )
  }

  const { data: subcontractor } = await client
    .from("project_subcontractors")
    .select("id")
    .eq("project_id", project.id)
    .eq("code", "SUB-T5")
    .single()
  if (!subcontractor) throw new Error("The subcontractor fixture was not written.")

  const withSubcontractor = buildTrack05FixturePlan(project.id, subcontractor.id, material.id, "")
  const procedures = await client
    .from("project_welding_procedures")
    .upsert(withSubcontractor.weldingProcedures, { onConflict: "project_id,code,revision" })
  const welders = await client
    .from("welder_qualifications")
    .upsert(withSubcontractor.welders, { onConflict: "project_id,welder_code" })
  if (procedures.error || welders.error) {
    throw new Error(procedures.error?.message ?? welders.error?.message)
  }

  const { data: wps } = await client
    .from("project_welding_procedures")
    .select("id")
    .eq("project_id", project.id)
    .eq("code", "WPS-T5")
    .single()
  const { data: welderRows } = await client
    .from("welder_qualifications")
    .select("id, welder_code")
    .eq("project_id", project.id)
    .in("welder_code", ["W-T5-1", "W-T5-2"])
  if (!wps || !welderRows) throw new Error("The WPS or welder fixtures were not written.")

  const links = await client.from("welder_wps_qualifications").upsert(
    welderRows.map((welder) => ({ welder_qualification_id: welder.id, wps_id: wps.id })),
    { onConflict: "welder_qualification_id,wps_id" },
  )
  if (links.error) throw new Error(links.error.message)

  const plan = buildTrack05FixturePlan(project.id, subcontractor.id, material.id, wps.id)
  console.log(
    `Track 05 fixtures reconciled: ${planInsertCount(plan)} rows upserted into project ${project.id}.`,
  )
}

if (process.argv[1]?.endsWith("bootstrap-track05-browser-fixtures.ts")) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
