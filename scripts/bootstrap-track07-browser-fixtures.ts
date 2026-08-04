import { readFileSync } from "node:fs"
import { join } from "node:path"

import { createClient } from "@supabase/supabase-js"
import { importSpoolgenDefinition, isLocalhost, signInFixtureOperator } from "./spoolgen-fixture-import"

export { isLocalhost }

export const TRACK07_ISO = "ISO-T7-001"
export const TRACK07_ROOT_WELDER = "W-T7-FIELD-ROOT"
export const TRACK07_CAP_WELDER = "W-T7-FIELD-CAP"

export interface Track07FixturePlan {
  welders: { project_id: string; subcontractor_id: string; welder_code: string; full_name: string; expires_on: string }[]
  fieldNdeRule: { project_id: string; service_class_id: string; weld_type_id: string; weld_location: string; rt_coverage: number; ut_coverage: number; pt_coverage: number; mt_coverage: number; ht_coverage: number; pmi_coverage: number; material_traceability_required: boolean; pwht_required: boolean; pwht_thickness_threshold: number | null; status: "active" }
  locations: { project_id: string; category_id: string; code: string; description: string }[]
}

export function buildTrack07FixturePlan(
  projectId: string,
  subcontractorId: string,
  _wpsId: string,
  serviceClassId: string,
  weldTypeId: string,
  categoryId: string,
): Track07FixturePlan {
  return {
    welders: [
      { project_id: projectId, subcontractor_id: subcontractorId, welder_code: TRACK07_ROOT_WELDER, full_name: "Track 07 field root welder", expires_on: "2028-01-01" },
      { project_id: projectId, subcontractor_id: subcontractorId, welder_code: TRACK07_CAP_WELDER, full_name: "Track 07 field cap welder", expires_on: "2028-01-01" },
    ],
    fieldNdeRule: {
      project_id: projectId, service_class_id: serviceClassId, weld_type_id: weldTypeId, weld_location: "field",
      rt_coverage: 100, ut_coverage: 0, pt_coverage: 0, mt_coverage: 0, ht_coverage: 0, pmi_coverage: 0,
      material_traceability_required: false, pwht_required: false, pwht_thickness_threshold: null, status: "active",
    },
    locations: [{ project_id: projectId, category_id: categoryId, code: "SITE-T7", description: "Track 07 erection site" }],
  }
}

export function buildTrack07WeldPoints(rootWelderId: string, capWelderId: string, weldedOn: string) {
  return [
    { point_type: "root", welder_qualification_id: rootWelderId, completion_percent: 50, welded_on: weldedOn },
    { point_type: "cap", welder_qualification_id: capWelderId, completion_percent: 50, welded_on: weldedOn },
  ]
}

export function parseTrack07WeldFixture(text: string) {
  const lines = text.trim().split("\n")
  const header = lines[0].split("\t")
  const index = (name: string) => header.indexOf(name)
  return lines.slice(1).map((line) => {
    const cells = line.split("\t")
    return {
      isoNumber: cells[index("ISO_NUMBER")],
      spoolNumber: cells[index("SPOOL_NUMBER")],
      weldNumber: cells[index("WELD_NUMBER")],
      weldLocation: cells[index("WELD_LOCATION")],
    }
  })
}

async function run(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!isLocalhost(url)) throw new Error("Refusing to run against a non-local Supabase URL.")
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required and must be supplied out of band.")
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""
  const password = process.env.TRACK01_FIXTURE_PASSWORD ?? ""
  if (!publishableKey || !password) throw new Error("SUPABASE_PUBLISHABLE_KEY and TRACK01_FIXTURE_PASSWORD are required out of band.")

  const client = createClient(url, serviceKey)
  const { data: project } = await client.from("projects").select("id").eq("activity_code", "TRACK01-A").single()
  if (!project) throw new Error("Project TRACK01-A was not found. Run Track 01 first.")
  const codedId = async (table: "project_subcontractors" | "project_welding_procedures" | "project_service_classes" | "project_weld_types" | "project_location_categories", code: string) => {
    const { data, error } = await client.from(table).select("id").eq("project_id", project.id).eq("code", code).single()
    if (error || !data) throw new Error(`${table} ${code} was not found.`)
    return data.id
  }
  const subcontractorId = await codedId("project_subcontractors", "SUB-T5")
  const wpsId = await codedId("project_welding_procedures", "WPS-T5")
  const serviceClassId = await codedId("project_service_classes", "SC-T4")
  const weldTypeId = await codedId("project_weld_types", "BW-T4")
  const categoryId = await codedId("project_location_categories", "CAT-T5")
  const plan = buildTrack07FixturePlan(project.id, subcontractorId, wpsId, serviceClassId, weldTypeId, categoryId)
  const seeded = await Promise.all([
    client.from("welder_qualifications").upsert(plan.welders, { onConflict: "project_id,welder_code" }),
    client.from("project_locations").upsert(plan.locations, { onConflict: "project_id,code" }),
    client.from("nde_matrix_rules").upsert(plan.fieldNdeRule, { onConflict: "project_id,service_class_id,weld_type_id,weld_location" }),
  ])
  for (const result of seeded) if (result.error) throw new Error(result.error.message)

  const imported = await signInFixtureOperator(url, publishableKey, password)
  try {
    const definition = await importSpoolgenDefinition(imported, project.id, TRACK07_ISO, {
      weld: readFileSync(join(__dirname, "weld-t7.txt"), "utf8"),
      trace: readFileSync(join(__dirname, "trace-t7.txt"), "utf8"),
    }, "Track 07 field erection fixture")
    const { data: iso, error: isoError } = await imported.from("isometrics").select("isometric_revisions(id, status)").eq("project_id", project.id).eq("iso_number", TRACK07_ISO).single()
    if (isoError || !iso) throw new Error(`The ${TRACK07_ISO} fixture was not imported.`)
    const revision = (iso as any).isometric_revisions.find((row: { id: string; status: string }) => row.status === "accepted")
    const { data: spools } = await imported.from("spool_revisions").select("id").eq("isometric_revision_id", revision.id)
    for (const spool of spools ?? []) {
      await imported.rpc("record_erection_progress", { target_spool_revision_id: spool.id, target_stage: "to_site", target_occurred_on: new Date().toISOString(), target_idempotency_key: `track07-to-site-${spool.id}` })
      const { data: lines } = await imported.from("spool_revision_materials").select("ident_code, quantity, trace_number").eq("spool_revision_id", spool.id)
      await imported.rpc("record_field_material_check", { target_spool_revision_id: spool.id, target_checked_on: new Date().toISOString(), target_items: (lines ?? []).map((line) => ({ ident_code: line.ident_code, trace_number: line.trace_number, quantity: line.quantity })), target_idempotency_key: `track07-material-${spool.id}` })
    }
    console.log(definition.skipped ? `${TRACK07_ISO} already existed; fixture reconciled.` : `${TRACK07_ISO} imported; To Site and field material seeded, field weld left open for the browser walk.`)
  } finally { await imported.auth.signOut() }
}

if (process.argv[1]?.endsWith("bootstrap-track07-browser-fixtures.ts")) run().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exit(1) })
