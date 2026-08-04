import { readFileSync } from "node:fs"
import { join } from "node:path"

import { createClient } from "@supabase/supabase-js"

import {
  importSpoolgenDefinition,
  isLocalhost,
  signInFixtureOperator,
} from "./spoolgen-fixture-import"

export { isLocalhost }

export const TRACK06_ISO = "ISO-T6-001"
export const TRACK06_ROOT_WELDER = "W-T6-1"
export const TRACK06_CAP_WELDER = "W-T6-2"

export interface Track06FixturePlan {
  welders: {
    project_id: string
    subcontractor_id: string
    welder_code: string
    full_name: string
    expires_on: string
  }[]
  welderWpsLinks: { welder_code: string; wps_id: string }[]
}

/**
 * Track 06's population is deliberately welded by its own pair of welders rather than
 * Track 05's. The NDE100 escalation is keyed on (project, welder) and rewrites every
 * remaining spot obligation that welder owns, so sharing W-T5-1 would let a Track 06
 * escalation reach into the Track 05 golden path and silently change what
 * `/fabrication/qc-release` demands of SP-T4-001-A.
 */
export function buildTrack06FixturePlan(
  projectId: string,
  subcontractorId: string,
  wpsId: string,
): Track06FixturePlan {
  return {
    welders: [
      {
        project_id: projectId,
        subcontractor_id: subcontractorId,
        welder_code: TRACK06_ROOT_WELDER,
        full_name: "Track 06 root welder",
        expires_on: "2028-01-01",
      },
      {
        project_id: projectId,
        subcontractor_id: subcontractorId,
        welder_code: TRACK06_CAP_WELDER,
        full_name: "Track 06 cap welder",
        expires_on: "2028-01-01",
      },
    ],
    welderWpsLinks: [
      { welder_code: TRACK06_ROOT_WELDER, wps_id: wpsId },
      { welder_code: TRACK06_CAP_WELDER, wps_id: wpsId },
    ],
  }
}

/**
 * Root and Cap must total exactly 100 and must not name the same welder — Track 05's
 * allocation invariant, enforced by record_weld_progress as PQC35 and by the weld
 * progress screen before it sends anything.
 */
export function buildWeldPoints(
  rootWelderId: string,
  capWelderId: string,
  weldedOn: string,
): { point_type: string; welder_qualification_id: string; completion_percent: number; welded_on: string }[] {
  return [
    { point_type: "root", welder_qualification_id: rootWelderId, completion_percent: 50, welded_on: weldedOn },
    { point_type: "cap", welder_qualification_id: capWelderId, completion_percent: 50, welded_on: weldedOn },
  ]
}

export interface WeldFixtureRow {
  spoolNumber: string
  weldNumber: string
  weldLocation: string
  thicknessMm: number
  serviceClass: string
  weldType: string
}

/** Parses `scripts/weld-t6.txt` so its invariants can be asserted without a database. */
export function parseWeldFixture(text: string): WeldFixtureRow[] {
  const lines = text.split("\n").filter((line) => line.trim().length > 0)
  const header = lines[0].split("\t")
  const index = (column: string): number => header.indexOf(column)
  return lines.slice(1).map((line) => {
    const cells = line.split("\t")
    return {
      spoolNumber: cells[index("SPOOL_NUMBER")],
      weldNumber: cells[index("WELD_NUMBER")],
      weldLocation: cells[index("WELD_LOCATION")],
      thicknessMm: Number(cells[index("THICKNESS_MM")]),
      serviceClass: cells[index("SERVICE_CLASS")],
      weldType: cells[index("WELD_TYPE")],
    }
  })
}

async function run(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!isLocalhost(url)) throw new Error("Refusing to run against a non-local Supabase URL.")
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required and must be supplied out of band.")
  }
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""
  const fixturePassword = process.env.TRACK01_FIXTURE_PASSWORD ?? ""
  if (!publishableKey) {
    throw new Error(
      "SUPABASE_PUBLISHABLE_KEY is required so the fixture operator can drive the import and the weld progress.",
    )
  }
  if (!fixturePassword) {
    throw new Error(
      "TRACK01_FIXTURE_PASSWORD is required and must match the value used by the Track 01 bootstrap.",
    )
  }

  const client = createClient(url, key)

  const { data: project } = await client
    .from("projects")
    .select("id")
    .eq("activity_code", "TRACK01-A")
    .maybeSingle()
  if (!project) throw new Error("Project TRACK01-A was not found. Run the Track 01 bootstrap first.")

  const codedId = async (
    table: "project_subcontractors" | "project_welding_procedures",
    code: string,
  ): Promise<string> => {
    const { data, error } = await client
      .from(table)
      .select("id")
      .eq("project_id", project.id)
      .eq("code", code)
      .single()
    if (error) {
      throw new Error(
        `${table} ${code} was not found: ${error.message}. Run the Track 05 bootstrap first.`,
      )
    }
    return (data as { id: string }).id
  }

  const subcontractorId = await codedId("project_subcontractors", "SUB-T5")
  const wpsId = await codedId("project_welding_procedures", "WPS-T5")

  const plan = buildTrack06FixturePlan(project.id, subcontractorId, wpsId)
  const welderUpsert = await client
    .from("welder_qualifications")
    .upsert(plan.welders, { onConflict: "project_id,welder_code" })
  if (welderUpsert.error) throw new Error(welderUpsert.error.message)

  const { data: welderRows, error: welderError } = await client
    .from("welder_qualifications")
    .select("id, welder_code")
    .eq("project_id", project.id)
    .in("welder_code", [TRACK06_ROOT_WELDER, TRACK06_CAP_WELDER])
  if (welderError || !welderRows || welderRows.length !== 2) {
    throw new Error("The Track 06 welder fixtures were not written.")
  }
  const welderIdOf = (code: string): string => {
    const row = welderRows.find((welder) => welder.welder_code === code)
    if (!row) throw new Error(`Welder ${code} was not written.`)
    return row.id
  }

  const links = await client.from("welder_wps_qualifications").upsert(
    welderRows.map((welder) => ({ welder_qualification_id: welder.id, wps_id: wpsId })),
    { onConflict: "welder_qualification_id,wps_id" },
  )
  if (links.error) throw new Error(links.error.message)

  console.log(
    `Track 06 welders reconciled: ${plan.welders.length} welders and ${plan.welderWpsLinks.length} WPS links in project ${project.id}.`,
  )

  const operator = await signInFixtureOperator(url, publishableKey, fixturePassword)
  try {
    const definition = await importSpoolgenDefinition(
      operator,
      project.id,
      TRACK06_ISO,
      {
        weld: readFileSync(join(__dirname, "weld-t6.txt"), "utf8"),
        // One bill line per spool. spool_fabrication_readiness treats a spool with no
        // bill of materials as never material-checked (`line_total > 0` is explicit in
        // the view), so a weld-only fixture would put "0 of 0 bill lines traced" on the
        // QC release screen and read like a defect when it is the rule working.
        trace: readFileSync(join(__dirname, "trace-t6.txt"), "utf8"),
      },
      "Track 06 fixture bootstrap",
    )
    console.log(
      definition.skipped
        ? `Engineering definition ${TRACK06_ISO} already has an accepted revision; nothing to import.`
        : `Engineering definition imported: ${definition.appliedRowCount} rows applied to ${TRACK06_ISO}.`,
    )

    const welded = await recordTrack06WeldProgress(
      operator,
      project.id,
      subcontractorId,
      wpsId,
      welderIdOf(TRACK06_ROOT_WELDER),
      welderIdOf(TRACK06_CAP_WELDER),
    )
    console.log(
      welded.recorded === 0
        ? `All ${welded.total} Track 06 joints already carry weld progress; nothing to record.`
        : `Weld progress recorded on ${welded.recorded} of ${welded.total} Track 06 joints; ` +
            `${welded.obligations} NDE obligations now exist on ${TRACK06_ISO}.`,
    )
  } finally {
    await operator.auth.signOut()
  }
}

/**
 * Welds the whole Track 06 population through `record_weld_progress`, the same RPC the
 * weld progress screen calls, so the obligations are generated by the matrix rule rather
 * than inserted behind it. Twelve joints at six fields each is not a browser task; what
 * the browser walk is for is the NDE work that follows.
 *
 * Joints that already carry a record are skipped, which keeps a second run identical and
 * avoids PQC36 once a joint has been locked by an accepted result.
 */
export async function recordTrack06WeldProgress(
  operator: Awaited<ReturnType<typeof signInFixtureOperator>>,
  projectId: string,
  subcontractorId: string,
  wpsId: string,
  rootWelderId: string,
  capWelderId: string,
): Promise<{ total: number; recorded: number; obligations: number }> {
  const { data: isometric, error: isoError } = await operator
    .from("isometrics")
    .select("id, isometric_revisions(id, status)")
    .eq("project_id", projectId)
    .eq("iso_number", TRACK06_ISO)
    .single()
  if (isoError) throw new Error(`${TRACK06_ISO} was not imported: ${isoError.message}`)
  const accepted = ((isometric as any).isometric_revisions ?? []).find(
    (revision: { status: string }) => revision.status === "accepted",
  )
  if (!accepted) throw new Error(`${TRACK06_ISO} has no accepted revision.`)

  const { data: spoolRevisions, error: spoolError } = await operator
    .from("spool_revisions")
    .select("id")
    .eq("isometric_revision_id", accepted.id)
  if (spoolError || !spoolRevisions?.length) {
    throw new Error(`${TRACK06_ISO} has no spool revisions.`)
  }

  const spoolRevisionIds = spoolRevisions.map((revision) => revision.id)

  const { data: joints, error: jointError } = await operator
    .from("weld_joint_revisions")
    .select("id, weld_joints(weld_number)")
    .in("spool_revision_id", spoolRevisionIds)
  if (jointError || !joints) throw new Error(`Could not read the ${TRACK06_ISO} joints.`)

  // Read the existing progress as its own query rather than as an embed on the joint.
  // The embedded form returned nothing here and every joint looked unwelded, so a second
  // bootstrap run reported twelve fresh records when the command receipts had in fact
  // replayed all twelve.
  const { data: existingProgress, error: progressError } = await operator
    .from("weld_progress_records")
    .select("weld_joint_revision_id")
    .in("spool_revision_id", spoolRevisionIds)
  if (progressError) throw new Error(progressError.message)
  const alreadyWelded = new Set(
    (existingProgress ?? []).map((record) => record.weld_joint_revision_id as string),
  )

  // Deterministic order, matching allocate_nde_batch_candidates' own
  // `order by weld_on, weld_number`: every joint shares one weld date, so the
  // allocation a walkthrough sees is the weld number order and nothing else.
  const ordered = [...joints].sort((left, right) =>
    ((left as any).weld_joints?.weld_number ?? "").localeCompare(
      (right as any).weld_joints?.weld_number ?? "",
    ),
  )

  const weldedOn = new Date().toISOString().slice(0, 10)
  let recorded = 0
  for (const joint of ordered) {
    if (alreadyWelded.has(joint.id as string)) continue
    const weldNumber = (joint as any).weld_joints?.weld_number ?? joint.id
    const { error } = await operator.rpc("record_weld_progress", {
      target_weld_joint_revision_id: joint.id,
      subcontractor_id: subcontractorId,
      welding_procedure_id: wpsId,
      points: buildWeldPoints(rootWelderId, capWelderId, weldedOn),
      dates: { weld_on: weldedOn },
      idempotency_key: `track06-fixture-weld-${weldNumber}`,
    })
    if (error) throw new Error(`Weld progress for ${weldNumber} failed: ${error.message}`)
    recorded += 1
  }

  const { count, error: countError } = await operator
    .from("nde_obligations")
    .select("id", { count: "exact", head: true })
    .in("spool_revision_id", spoolRevisionIds)
  if (countError) throw new Error(countError.message)

  return { total: ordered.length, recorded, obligations: count ?? 0 }
}

if (process.argv[1]?.endsWith("bootstrap-track06-browser-fixtures.ts")) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
