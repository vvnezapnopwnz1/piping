import { createClient } from "@supabase/supabase-js"

export const isLocalhost = (url: string): boolean => {
  try {
    return ["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname)
  } catch {
    return false
  }
}

export interface Track05FixturePlan {
  subcontractors: { project_id: string; code: string; description: string }[]
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
  locationCategories: { project_id: string; code: string; description: string }[]
  locations: { project_id: string; category_id: string; code: string; description: string }[]
  lineServices: { project_id: string; code: string; description: string }[]
  ralCodes: {
    project_id: string
    line_service_id: string
    color_code: string
    ral_code: string
  }[]
  paintMatrixRules: {
    project_id: string
    line_service_id: string
    ral_code_id: string
    blasting_required: boolean
    primer_required: boolean
    intermediate_coat_count: number
    final_coat_count: number
    required_final_dft_microns: number
  }[]
}

/**
 * The referentials a Track 05 walkthrough needs on top of the Track 01-04 fixtures.
 * `materialTypeId` is the system reference entry the WPS is qualified for. The four
 * remaining ids are resolved by `run()` after their parent rows exist, because
 * project_locations.category_id and project_paint_matrix_rules.{line_service_id,
 * ral_code_id} are all not-null foreign keys.
 */
export function buildTrack05FixturePlan(
  projectId: string,
  subcontractorId: string,
  materialTypeId: string,
  wpsId: string,
  locationCategoryId: string,
  lineServiceId: string,
  ralCodeId: string,
): Track05FixturePlan {
  return {
    subcontractors: [
      { project_id: projectId, code: "SUB-T5", description: "Track 05 fabricator" },
    ],
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
      { project_id: projectId, mrr_number: "MRR-T5-1", ident_code: "IDN-T5-100", trace_number: "HEAT-T5-100" },
      { project_id: projectId, mrr_number: "MRR-T5-1", ident_code: "IDN-T5-200", trace_number: "HEAT-T5-200" },
      { project_id: projectId, mrr_number: "MRR-T5-1", ident_code: "IDN-T5-300", trace_number: "HEAT-T5-300" },
    ],
    locationCategories: [
      { project_id: projectId, code: "CAT-T5", description: "Track 05 laydown areas" },
    ],
    locations: [
      {
        project_id: projectId,
        category_id: locationCategoryId,
        code: "YARD-T5",
        description: "Track 05 laydown yard",
      },
    ],
    lineServices: [
      { project_id: projectId, code: "LS-T5", description: "Track 05 line service" },
    ],
    ralCodes: [
      {
        project_id: projectId,
        line_service_id: lineServiceId,
        color_code: "SILVER",
        ral_code: "RAL 9006",
      },
    ],
    paintMatrixRules: [
      {
        project_id: projectId,
        line_service_id: lineServiceId,
        ral_code_id: ralCodeId,
        blasting_required: true,
        primer_required: true,
        intermediate_coat_count: 1,
        final_coat_count: 1,
        required_final_dft_microns: 240,
      },
    ],
  }
}

export const planInsertCount = (plan: Track05FixturePlan): number =>
  plan.subcontractors.length +
  plan.weldingProcedures.length +
  plan.welders.length +
  plan.welderWpsLinks.length +
  plan.pmlRecords.length +
  plan.locationCategories.length +
  plan.locations.length +
  plan.lineServices.length +
  plan.ralCodes.length +
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

  const empty = buildTrack05FixturePlan(project.id, "", material.id, "", "", "", "")

  const firstWave = await Promise.all([
    client.from("project_subcontractors").upsert(empty.subcontractors, { onConflict: "project_id,code" }),
    client.from("project_location_categories").upsert(empty.locationCategories, { onConflict: "project_id,code" }),
    client.from("project_line_services").upsert(empty.lineServices, { onConflict: "project_id,code" }),
    client.from("piping_material_records").upsert(empty.pmlRecords, { onConflict: "project_id,ident_code,trace_number" }),
  ])
  for (const result of firstWave) if (result.error) throw new Error(result.error.message)

  // The table name is a literal union rather than `string`, otherwise the generated
  // Database types cannot resolve `.from()` and typecheck fails.
  type CodedTable =
    | "project_subcontractors"
    | "project_location_categories"
    | "project_line_services"
    | "project_welding_procedures"
  const idOf = async (table: CodedTable, code: string): Promise<string> => {
    const { data, error } = await client
      .from(table)
      .select("id")
      .eq("project_id", project.id)
      .eq("code", code)
      .single()
    if (error) throw new Error(`${table} fixture ${code} was not written: ${error.message}`)
    return (data as { id: string }).id
  }

  const subcontractorId = await idOf("project_subcontractors", "SUB-T5")
  const categoryId = await idOf("project_location_categories", "CAT-T5")
  const lineServiceId = await idOf("project_line_services", "LS-T5")

  const second = buildTrack05FixturePlan(
    project.id, subcontractorId, material.id, "", categoryId, lineServiceId, "",
  )
  const secondWave = await Promise.all([
    client.from("project_locations").upsert(second.locations, { onConflict: "project_id,code" }),
    client.from("project_ral_codes").upsert(second.ralCodes, { onConflict: "project_id,line_service_id" }),
    client.from("project_welding_procedures").upsert(second.weldingProcedures, { onConflict: "project_id,code,revision" }),
    client.from("welder_qualifications").upsert(second.welders, { onConflict: "project_id,welder_code" }),
  ])
  for (const result of secondWave) if (result.error) throw new Error(result.error.message)

  const { data: ralRow, error: ralError } = await client
    .from("project_ral_codes")
    .select("id")
    .eq("project_id", project.id)
    .eq("ral_code", "RAL 9006")
    .single()
  if (ralError) throw new Error(`The RAL fixture was not written: ${ralError.message}`)
  const wpsId = await idOf("project_welding_procedures", "WPS-T5")

  const full = buildTrack05FixturePlan(
    project.id, subcontractorId, material.id, wpsId, categoryId, lineServiceId,
    (ralRow as { id: string }).id,
  )
  const paint = await client
    .from("project_paint_matrix_rules")
    .upsert(full.paintMatrixRules, { onConflict: "project_id,line_service_id" })
  if (paint.error) throw new Error(paint.error.message)

  const { data: welderRows, error: welderError } = await client
    .from("welder_qualifications")
    .select("id, welder_code")
    .eq("project_id", project.id)
    .in("welder_code", ["W-T5-1", "W-T5-2"])
  if (welderError || !welderRows) throw new Error("The welder fixtures were not written.")

  const links = await client.from("welder_wps_qualifications").upsert(
    welderRows.map((welder) => ({ welder_qualification_id: welder.id, wps_id: wpsId })),
    { onConflict: "welder_qualification_id,wps_id" },
  )
  if (links.error) throw new Error(links.error.message)

  // Track 04 seeds the matrix rule with rt_coverage 10 and pwht_required false, which
  // makes the PWHT half of the golden path unreachable. 8.2 mm joints clear an 8 mm
  // threshold, so one PWHT requirement is generated per shop joint.
  const matrix = await client
    .from("nde_matrix_rules")
    .update({ pwht_required: true, pwht_thickness_threshold: 8 })
    .eq("project_id", project.id)
  if (matrix.error) throw new Error(matrix.error.message)

  console.log(
    `Track 05 referentials reconciled: ${planInsertCount(full)} rows upserted into project ${project.id}.`,
  )
}

if (process.argv[1]?.endsWith("bootstrap-track05-browser-fixtures.ts")) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
