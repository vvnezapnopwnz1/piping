/**
 * Builds the SHOWCASE-1 dataset by driving the same commands the browser drives.
 *
 * Nothing here inserts into a progress table directly. Every stage, weld, release, paint and
 * laydown goes through its `SECURITY DEFINER` command, which is what guarantees the seeded state
 * is reachable — and therefore editable — through the UI. Direct writes would let the seeder
 * build combinations the UI believes impossible, and the first operator to click a stage would
 * hit a PQC32 wall that makes no sense against what the screen shows.
 *
 * Run after `npm run demo:prepare -- --confirm-local-reset`, never inside it: prepare runs
 * `supabase db reset`, which drops everything this script writes.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { SHOWCASE_PROJECT_CODE } from "./demo/manifest"
import {
  SHOWCASE_EXPECTED_COUNTS,
  SHOWCASE_ISO_NUMBERS,
  buildShowcaseProgressPlan,
  buildShowcaseSpoolgenFiles,
  type ShowcaseSpoolPlan,
} from "./demo/showcase-dataset"
import {
  importSpoolgenDefinition,
  isLocalhost,
  signInFixtureOperator,
} from "./spoolgen-fixture-import"

export { isLocalhost }

const RESET_FLAG = "--reset-showcase"

/**
 * Almost every foreign key into the engineering tables is RESTRICT, and the weld lock trigger
 * (20260804092200_weld_progress_locks.sql) refuses to delete point assignments for a weld that
 * carries an accepted NDE result. A partial teardown would therefore have to fight both the FK
 * web and the lock, and would rot the moment a table is added. `supabase db reset` inside
 * `demo:prepare` is the authoritative reset, so the flag points at it rather than reimplementing
 * a worse one.
 */
const RESET_GUIDANCE =
  `${RESET_FLAG} cannot delete a seeded showcase project: the engineering foreign keys are ` +
  `RESTRICT and accepted NDE results lock their welds. Rebuild the stand instead:\n` +
  `  npm run demo:prepare -- --confirm-local-reset\n` +
  `  npm run demo:showcase`

interface ReferenceIds {
  readonly subcontractorId: string
  readonly weldingProcedureId: string
  readonly laydownLocationId: string
  readonly lineServiceId: string
  /**
   * Welders qualified for `weldingProcedureId`, in a stable order. `record_weld_progress` rejects
   * a welder who is not qualified for the record's WPS, and root and cap must be different
   * welders, so the WPS chosen is whichever has the largest qualified pool — with the manifest's
   * referentials that is `WPS-CS-GTAW-01` with two welders.
   */
  readonly qualifiedWelderIds: readonly string[]
}

async function call(
  operator: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
  context: string,
): Promise<unknown> {
  const { data, error } = await operator.rpc(fn, args)
  if (error) throw new Error(`${fn} failed for ${context}: ${error.message}`)
  return data
}

async function resolveReferenceIds(
  operator: SupabaseClient,
  projectId: string,
): Promise<ReferenceIds> {
  const single = async (table: string, column: string) => {
    const { data, error } = await operator
      .from(table)
      .select("id")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order(column)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Reading ${table} failed: ${error.message}`)
    if (!data) throw new Error(`${SHOWCASE_PROJECT_CODE} has no active ${table} row.`)
    return (data as unknown as { id: string }).id
  }

  const { data: qualifications, error: qualificationError } = await operator
    .from("welder_wps_qualifications")
    .select(
      "wps_id, welder_qualification_id, welder_qualifications!inner(project_id, welder_code, status)",
    )
    .eq("welder_qualifications.project_id", projectId)
    .eq("welder_qualifications.status", "active")
  if (qualificationError) {
    throw new Error(`Reading welder qualifications failed: ${qualificationError.message}`)
  }

  const poolByWps = new Map<string, { welderId: string; welderCode: string }[]>()
  for (const row of qualifications ?? []) {
    const typed = row as unknown as {
      wps_id: string
      welder_qualification_id: string
      welder_qualifications: { welder_code: string }
    }
    const pool = poolByWps.get(typed.wps_id) ?? []
    pool.push({
      welderId: typed.welder_qualification_id,
      welderCode: typed.welder_qualifications.welder_code,
    })
    poolByWps.set(typed.wps_id, pool)
  }

  const [weldingProcedureId, pool] =
    [...poolByWps.entries()].sort(
      (left, right) => right[1].length - left[1].length,
    )[0] ?? []
  if (!weldingProcedureId || !pool || pool.length < 2) {
    throw new Error(
      `${SHOWCASE_PROJECT_CODE} has no welding procedure with two qualified welders; ` +
        `root and cap must be different welders.`,
    )
  }

  return {
    subcontractorId: await single("project_subcontractors", "code"),
    weldingProcedureId,
    laydownLocationId: await single("project_locations", "code"),
    lineServiceId: await single("project_line_services", "code"),
    qualifiedWelderIds: [...pool]
      .sort((left, right) => left.welderCode.localeCompare(right.welderCode))
      .map((entry) => entry.welderId),
  }
}

async function resolveSpoolRevisionIds(
  operator: SupabaseClient,
  projectId: string,
): Promise<ReadonlyMap<string, string>> {
  const { data, error } = await operator
    .from("spool_revisions")
    .select(
      "id, spools!inner(spool_number), isometric_revisions!inner(status, isometrics!inner(project_id))",
    )
    .eq("isometric_revisions.isometrics.project_id", projectId)
    .eq("isometric_revisions.status", "accepted")
  if (error) throw new Error(`Reading spool revisions failed: ${error.message}`)
  // `spools` is a to-one embed: PostgREST returns an object even though the generated types
  // describe an array. Same reading as commit c61ac28 for support_progress_records.
  return new Map(
    (data ?? []).map((row) => {
      const typed = row as unknown as {
        id: string
        spools: { spool_number: string }
      }
      return [typed.spools.spool_number, typed.id]
    }),
  )
}

async function resolveWeldJointRevisionIds(
  operator: SupabaseClient,
  spoolRevisionIds: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const { data, error } = await operator
    .from("weld_joint_revisions")
    .select("id, weld_joints!inner(weld_number)")
    .in("spool_revision_id", spoolRevisionIds)
  if (error) throw new Error(`Reading weld joints failed: ${error.message}`)
  return new Map(
    (data ?? []).map((row) => {
      const typed = row as unknown as {
        id: string
        weld_joints: { weld_number: string }
      }
      return [typed.weld_joints.weld_number, typed.id]
    }),
  )
}

/**
 * Everything a spool needs before NDE can run: the fabrication start, the material check, the
 * shop welds and the supports. Welding is what creates the NDE obligations, so it must complete
 * across the whole project before any batch is allocated.
 */
async function seedSpoolBeforeNde(
  operator: SupabaseClient,
  spool: ShowcaseSpoolPlan,
  revisionId: string,
  weldJointIds: ReadonlyMap<string, string>,
  references: ReferenceIds,
): Promise<void> {
  const startFab = spool.stages.find((stage) => stage.stage === "start_fab")
  if (startFab) {
    await call(
      operator,
      "record_construction_progress",
      {
        target_spool_revision_id: revisionId,
        target_phase: "fabrication",
        target_stage: "start_fab",
        target_occurred_on: startFab.occurredOn,
        target_idempotency_key: `showcase-start-fab-${spool.spoolNumber}`,
      },
      `${spool.spoolNumber}/start_fab`,
    )
  }

  if (spool.materialCheckOn) {
    const { data: lines } = await operator
      .from("spool_revision_materials")
      .select("ident_code, quantity, trace_number")
      .eq("spool_revision_id", revisionId)
    await call(
      operator,
      "record_material_check",
      {
        target_spool_revision_id: revisionId,
        target_checked_on: spool.materialCheckOn,
        target_items: (lines ?? []).map((line) => ({
          ident_code: (line as { ident_code: string }).ident_code,
          trace_number: (line as { trace_number: string | null }).trace_number,
          quantity: (line as { quantity: number }).quantity,
        })),
        target_idempotency_key: `showcase-material-${spool.spoolNumber}`,
      },
      `${spool.spoolNumber}/material_check`,
    )
  }

  for (const joint of spool.weldedJoints) {
    const weldJointRevisionId = weldJointIds.get(joint.weldNumber)
    if (!weldJointRevisionId) {
      throw new Error(`${joint.weldNumber} was not imported.`)
    }
    const pool = references.qualifiedWelderIds
    const rootWelderId = pool[joint.welderRotation % pool.length]
    const capWelderId = pool[(joint.welderRotation + 1) % pool.length]
    await call(
      operator,
      "record_weld_progress",
      {
        target_weld_joint_revision_id: weldJointRevisionId,
        subcontractor_id: references.subcontractorId,
        welding_procedure_id: references.weldingProcedureId,
        points: [
          { point_type: "root", welder_qualification_id: rootWelderId, completion_percent: 50, welded_on: joint.weldedOn },
          { point_type: "cap", welder_qualification_id: capWelderId, completion_percent: 50, welded_on: joint.weldedOn },
        ],
        dates: { weld_on: joint.weldedOn },
        idempotency_key: `showcase-weld-${joint.weldNumber}`,
      },
      `${spool.spoolNumber}/${joint.weldNumber}`,
    )
  }

  if (spool.supportsInstalledOn) {
    const { data: supports, error } = await operator
      .from("support_revisions")
      .select("id")
      .eq("spool_revision_id", revisionId)
    if (error) throw new Error(`Reading supports failed: ${error.message}`)
    for (const support of supports ?? []) {
      const supportId = (support as unknown as { id: string }).id
      await call(
        operator,
        "record_support_progress",
        {
          target_support_revision_id: supportId,
          installed_on: spool.supportsInstalledOn,
          idempotency_key: `showcase-support-${supportId}`,
        },
        `${spool.spoolNumber}/support`,
      )
    }
  }
}

/**
 * Everything that depends on NDE having been satisfied. `release_quality_record` refuses a spool
 * with outstanding obligations ("N NDE obligations on this spool are still outstanding"), which
 * is why this half runs only after the batches are recorded.
 */
async function seedSpoolAfterNde(
  operator: SupabaseClient,
  spool: ShowcaseSpoolPlan,
  revisionId: string,
  references: ReferenceIds,
): Promise<void> {
  if (spool.qualityReleaseOn) {
    await call(
      operator,
      "release_quality_record",
      {
        target_spool_revision_id: revisionId,
        released_on: spool.qualityReleaseOn,
        idempotency_key: `showcase-qc-release-${spool.spoolNumber}`,
      },
      `${spool.spoolNumber}/qc_release`,
    )
  }

  const sentToPaint = spool.stages.find((stage) => stage.stage === "sent_to_paint")
  if (sentToPaint) {
    await call(
      operator,
      "record_construction_progress",
      {
        target_spool_revision_id: revisionId,
        target_phase: "fabrication",
        target_stage: "sent_to_paint",
        target_occurred_on: sentToPaint.occurredOn,
        target_idempotency_key: `showcase-sent-to-paint-${spool.spoolNumber}`,
      },
      `${spool.spoolNumber}/sent_to_paint`,
    )
  }

  if (spool.paintedOn) {
    await call(
      operator,
      "record_paint_progress",
      {
        target_spool_revision_id: revisionId,
        line_service_id: references.lineServiceId,
        // One command derives two stages: `painted` from painted_on and `final_qc` from
        // final_qc_on. record_laydown refuses a spool without the latter.
        details: {
          painted_on: spool.paintedOn,
          ...(spool.finalQcOn ? { final_qc_on: spool.finalQcOn } : {}),
        },
        idempotency_key: `showcase-paint-${spool.spoolNumber}`,
      },
      `${spool.spoolNumber}/painted`,
    )
  }

  if (spool.laydownOn) {
    await call(
      operator,
      "record_laydown",
      {
        target_spool_revision_id: revisionId,
        location_id: references.laydownLocationId,
        stored_on: spool.laydownOn,
        idempotency_key: `showcase-laydown-${spool.spoolNumber}`,
      },
      `${spool.spoolNumber}/laydown`,
    )
  }

  for (const stage of spool.stages) {
    if (stage.phase !== "erection") continue
    await call(
      operator,
      "record_erection_progress",
      {
        target_spool_revision_id: revisionId,
        target_stage: stage.stage,
        target_occurred_on: stage.occurredOn,
        target_idempotency_key: `showcase-erection-${spool.spoolNumber}-${stage.stage}`,
      },
      `${spool.spoolNumber}/${stage.stage}`,
    )
  }
}

/**
 * Batches every pending obligation, then records an outcome for each.
 *
 * The accepted/rejected split and the locked/unlocked split come from the same place: a weld with
 * an accepted result locks (`weld_progress_records.is_locked`, enforced by the trigger in
 * 20260804092200_weld_progress_locks.sql), and a spool cannot be quality-released while any
 * obligation is outstanding. So obligations on released spools are all accepted — those welds end
 * up locked — while spools left mid-welding keep theirs pending and stay editable. Rejections go
 * only to spools that were never going to be released, because a rejection raises a repair
 * obligation that would block the release.
 */
async function seedNde(
  operator: SupabaseClient,
  projectId: string,
  releasedRevisionIds: ReadonlySet<string>,
  examinedOn: string,
): Promise<{ accepted: number; rejected: number; pending: number }> {
  const { data: obligations, error } = await operator
    .from("nde_obligations")
    .select("id, method, coverage_regime, spool_revision_id, disposition")
    .eq("project_id", projectId)
    .eq("disposition", "pending")
  if (error) throw new Error(`Reading NDE obligations failed: ${error.message}`)

  const rows = (obligations ?? []) as unknown as {
    id: string
    method: string
    coverage_regime: string
    spool_revision_id: string
  }[]
  const releasable = rows.filter((row) => releasedRevisionIds.has(row.spool_revision_id))
  const held = rows.filter((row) => !releasedRevisionIds.has(row.spool_revision_id))

  // A batch is scoped to one (method, coverage regime) pair — `nde_batch_candidates` filters on
  // both — so the pairs present in the obligations decide how many batches there are.
  const pairs = [
    ...new Set(releasable.map((row) => `${row.method}|${row.coverage_regime}`)),
  ]
  for (const pair of pairs) {
    const [method, coverageRegime] = pair.split("|")
    const batch = (await call(
      operator,
      "create_nde_batch",
      {
        target_project_id: projectId,
        method,
        coverage_regime: coverageRegime,
        idempotency_key: `showcase-nde-batch-${pair}`,
      },
      `batch/${pair}`,
    )) as { id: string }
    await call(
      operator,
      "allocate_nde_batch_candidates",
      {
        target_batch_id: batch.id,
        target_percentage: 100,
        idempotency_key: `showcase-nde-allocate-${pair}`,
      },
      `batch/${pair}/allocate`,
    )
    await call(
      operator,
      "issue_nde_batch",
      { target_batch_id: batch.id, idempotency_key: `showcase-nde-issue-${pair}` },
      `batch/${pair}/issue`,
    )
  }

  // Every obligation on a spool bound for release is accepted, or the release is refused.
  let accepted = 0
  for (const obligation of releasable) {
    await call(
      operator,
      "record_nde_result",
      {
        target_obligation_id: obligation.id,
        outcome: "accepted",
        examined_on: examinedOn,
        report_number: `RPT-${obligation.id.slice(0, 8)}`,
        idempotency_key: `showcase-nde-result-${obligation.id}`,
      },
      `obligation/${obligation.id}`,
    )
    accepted += 1
  }

  return { accepted, rejected: 0, pending: held.length }
}

async function run(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!isLocalhost(url)) {
    throw new Error("Refusing to run against a non-local Supabase URL.")
  }
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  const password = process.env.TRACK01_FIXTURE_PASSWORD ?? ""
  if (!serviceKey || !publishableKey || !password) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY, a publishable key and TRACK01_FIXTURE_PASSWORD must be set in .env.local.",
    )
  }

  const admin = createClient(url, serviceKey)
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id")
    .eq("activity_code", SHOWCASE_PROJECT_CODE)
    .maybeSingle()
  if (projectError) throw new Error(`Reading projects failed: ${projectError.message}`)
  if (!project) {
    throw new Error(
      `${SHOWCASE_PROJECT_CODE} does not exist. Run npm run demo:prepare -- --confirm-local-reset first.`,
    )
  }
  const projectId = (project as { id: string }).id

  const { count, error: countError } = await admin
    .from("isometrics")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
  if (countError) throw new Error(`Counting isometrics failed: ${countError.message}`)

  if ((count ?? 0) > 0) {
    if (process.argv.includes(RESET_FLAG)) throw new Error(RESET_GUIDANCE)
    console.log(
      `${SHOWCASE_PROJECT_CODE} already holds ${count} isometrics; nothing to do.`,
    )
    return
  }

  const operator = await signInFixtureOperator(url, publishableKey, password)
  try {
    for (const isoNumber of SHOWCASE_ISO_NUMBERS) {
      const result = await importSpoolgenDefinition(
        operator,
        projectId,
        isoNumber,
        buildShowcaseSpoolgenFiles(isoNumber),
        `Showcase dataset ${isoNumber}`,
      )
      console.log(
        `${isoNumber}: ${result.skipped ? "already present" : `imported ${result.appliedRowCount} rows`}`,
      )
    }

    // Read as the operator, not the service role: service_role holds no SELECT on `spools`, and
    // reading through RLS also proves the seeded rows are visible to a real signed-in user.
    const references = await resolveReferenceIds(operator, projectId)
    const spoolRevisionIds = await resolveSpoolRevisionIds(operator, projectId)
    const weldJointIds = await resolveWeldJointRevisionIds(operator, [
      ...spoolRevisionIds.values(),
    ])

    const plan = buildShowcaseProgressPlan(new Date())
    const active = plan.spools.filter(
      (spool) => spool.stages.length > 0 || spool.weldedJoints.length > 0,
    )
    const revisionIdFor = (spool: ShowcaseSpoolPlan) => {
      const revisionId = spoolRevisionIds.get(spool.spoolNumber)
      if (!revisionId) throw new Error(`${spool.spoolNumber} was not imported.`)
      return revisionId
    }

    for (const spool of active) {
      await seedSpoolBeforeNde(
        operator,
        spool,
        revisionIdFor(spool),
        weldJointIds,
        references,
      )
    }

    const releasedRevisionIds = new Set(
      active
        .filter((spool) => spool.qualityReleaseOn !== undefined)
        .map((spool) => revisionIdFor(spool)),
    )
    const ndeCounts = await seedNde(
      operator,
      projectId,
      releasedRevisionIds,
      plan.spools.flatMap((spool) => spool.weldedJoints).at(-1)?.weldedOn ??
        new Date().toISOString().slice(0, 10),
    )

    for (const spool of active) {
      await seedSpoolAfterNde(operator, spool, revisionIdFor(spool), references)
    }

    console.log(
      `NDE: ${ndeCounts.accepted} accepted, ${ndeCounts.rejected} rejected, ` +
        `${ndeCounts.pending} left pending on unreleased spools.`,
    )
    console.log(
      "\nNote: `npm run test:db` asserts against globally empty engineering tables, so it now\n" +
        "fails on this stand. Run it before seeding:\n" +
        "  npm run demo:prepare -- --confirm-local-reset && npm run verify && npm run demo:showcase",
    )
    console.log(
      `${SHOWCASE_PROJECT_CODE} seeded: ${SHOWCASE_EXPECTED_COUNTS.isometrics} isometrics, ` +
        `${SHOWCASE_EXPECTED_COUNTS.spoolRevisions} spools, ` +
        `${SHOWCASE_EXPECTED_COUNTS.weldJointRevisions} weld joints, ` +
        `${SHOWCASE_EXPECTED_COUNTS.constructionEvents} progress events, ` +
        `${SHOWCASE_EXPECTED_COUNTS.weldProgressRecords} weld progress records.`,
    )
  } finally {
    await operator.auth.signOut()
  }
}

if (process.argv[1]?.endsWith("bootstrap-showcase-dataset.ts")) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
