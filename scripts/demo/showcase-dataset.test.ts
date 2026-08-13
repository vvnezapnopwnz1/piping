import assert from "node:assert/strict"
import test from "node:test"

import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"
import { DEMO_MANIFEST } from "./manifest"
import {
  SHOWCASE_EXPECTED_COUNTS,
  SHOWCASE_ISO_NUMBERS,
  SHOWCASE_WEEK_COUNT,
  SHOWCASE_WELD_COMBINATIONS,
  buildShowcaseProgressPlan,
  buildShowcaseSpoolgenFiles,
} from "./showcase-dataset"

const BASE = new Date("2026-08-13T00:00:00.000Z")

const weldRows = (isoNumber: string): string[][] =>
  buildShowcaseSpoolgenFiles(isoNumber)
    .weld.trim()
    .split("\n")
    .slice(1)
    .map((row) => row.split("\t"))

test("the dataset is eight isometrics across three PDS areas", () => {
  assert.equal(SHOWCASE_ISO_NUMBERS.length, 8)
  const areas = new Set(
    SHOWCASE_ISO_NUMBERS.flatMap((iso) => weldRows(iso).map((row) => row[2])),
  )
  assert.deepEqual([...areas].sort(), ["PDS-100", "PDS-200", "PDS-300"])
})

test("every view the sweep reads stays far below the PostgREST max_rows ceiling", () => {
  for (const [name, count] of Object.entries(SHOWCASE_EXPECTED_COUNTS)) {
    assert.ok(count < 700, `${name}=${count} leaves no headroom under max_rows=1000`)
  }
  assert.equal(SHOWCASE_EXPECTED_COUNTS.isometrics, 8)
  assert.equal(SHOWCASE_EXPECTED_COUNTS.spoolRevisions, 16)
  assert.equal(SHOWCASE_EXPECTED_COUNTS.weldJointRevisions, 112)
})

test("progress is spread across the twelve-week window, not clustered on one date", () => {
  const plan = buildShowcaseProgressPlan(BASE)
  const dates = plan.spools.flatMap((spool) => [
    ...spool.stages.map((stage) => stage.occurredOn),
    ...spool.weldedJoints.map((joint) => joint.weldedOn),
  ])
  const weeks = new Set(
    dates.map((date) =>
      Math.floor(
        (BASE.getTime() - new Date(`${date}T00:00:00.000Z`).getTime()) /
          (7 * 86_400_000),
      ),
    ),
  )

  assert.ok(
    weeks.size >= SHOWCASE_WEEK_COUNT - 2,
    `progress covers only ${weeks.size} weekly buckets`,
  )
  assert.ok(
    Math.max(...dates.map((date) => Date.parse(date))) <= BASE.getTime(),
    "no progress date may be in the future",
  )
})

test("only stages the phase policy marks recordable are ever emitted", () => {
  // Mirrors public.construction_phase_stages, seeded in
  // supabase/migrations/20260810091000_construction_phase_policy.sql
  const recordable = new Set([
    "start_fab",
    "sent_to_paint",
    "to_site",
    "erected",
    "welded_bolted",
    "supported",
  ])

  for (const spool of buildShowcaseProgressPlan(BASE).spools) {
    for (const stage of spool.stages) {
      assert.ok(
        recordable.has(stage.stage),
        `${stage.stage} is derived and cannot go through record_construction_progress`,
      )
    }
  }
})

test("sent_to_paint never precedes start_fab, which record_construction_progress rejects", () => {
  for (const spool of buildShowcaseProgressPlan(BASE).spools) {
    const startFab = spool.stages.find((stage) => stage.stage === "start_fab")
    const sentToPaint = spool.stages.find((stage) => stage.stage === "sent_to_paint")
    if (!sentToPaint) continue
    assert.ok(startFab, `${spool.spoolNumber} paints without starting fabrication`)
    assert.ok(
      Date.parse(startFab.occurredOn) <= Date.parse(sentToPaint.occurredOn),
      `${spool.spoolNumber} would raise PQC32`,
    )
  }
})

test("exactly one spool has nothing recorded, so the sweep has an untouched control", () => {
  const untouched = buildShowcaseProgressPlan(BASE).spools.filter(
    (spool) => spool.stages.length === 0 && spool.weldedJoints.length === 0,
  )

  assert.equal(untouched.length, 1)
  assert.equal(untouched[0].spoolNumber, "SP-1008-B")
})

test("spools short of quality release keep open joints for the edit pass", () => {
  const plan = buildShowcaseProgressPlan(BASE)
  const started = plan.spools.filter((spool) => spool.weldedJoints.length > 0)
  const withoutRelease = started.filter((spool) => spool.qualityReleaseOn === undefined)

  assert.ok(
    withoutRelease.length >= 3,
    "no spool is left mid-welding, so nothing is safely editable",
  )
  // A released spool must have every shop weld done, because `fabricated` derives from them.
  const releasedWeldCounts = new Set(
    started
      .filter((spool) => spool.qualityReleaseOn !== undefined)
      .map((spool) => spool.weldedJoints.length),
  )
  assert.ok(
    [...releasedWeldCounts].every((count) => count >= 5),
    `a released spool carries too few welds: ${[...releasedWeldCounts].join(", ")}`,
  )
  assert.ok(
    withoutRelease.every((spool) => spool.weldedJoints.length === 4),
    "a spool short of release should keep joints open",
  )
})

test("exactly one spool reaches every erection stage, so one derives RFT", () => {
  const plan = buildShowcaseProgressPlan(BASE)
  const supported = plan.spools.filter((spool) =>
    spool.stages.some((stage) => stage.stage === "supported"),
  )

  assert.equal(supported.length, 1)
  assert.equal(supported[0].spoolNumber, "SP-1001-A")
})

test("generated SpoolGen files pass the real validator with zero blockers", () => {
  for (const isoNumber of SHOWCASE_ISO_NUMBERS) {
    const submission = buildSpoolgenSubmission(buildShowcaseSpoolgenFiles(isoNumber))
    assert.equal(
      submission.summary.blockerCount,
      0,
      `${isoNumber}: ${submission.issues
        .filter((issue) => issue.severity === "blocker")
        .map((issue) => `${issue.code} ${issue.message}`)
        .join("; ")}`,
    )
  }
})

test("every weld combination is covered by a seeded NDE matrix rule", () => {
  // The server-side import revalidation raises SRV_NDE_MATRIX_MISSING and refuses the whole job
  // when a service class / weld type / location triple has no rule. The manifest seeds
  // SC-CS150 for BW|shop, BW|field and SW|shop — SW|field is deliberately absent.
  const covered = new Set(
    DEMO_MANIFEST.references.ndeMatrixRules
      .filter((rule) => rule.serviceClassCode === "SC-CS150")
      .map((rule) => `${rule.weldTypeCode}|${rule.locationType}`),
  )
  assert.equal(covered.has("SW|field"), false, "the fixture assumption changed")

  const emitted = new Set(
    SHOWCASE_ISO_NUMBERS.flatMap((iso) =>
      weldRows(iso).map((row) => `${row[9]}|${row[10]}`),
    ),
  )
  for (const combination of emitted) {
    assert.ok(covered.has(combination), `no NDE matrix rule covers ${combination}`)
  }
  assert.deepEqual([...emitted].sort(), [...SHOWCASE_WELD_COMBINATIONS].sort())
})

test("every material line resolves against a seeded PML receipt", () => {
  // record_material_check looks piping_material_records up by ident code AND trace number
  // (20260804091000_material_traceability.sql), so a line the PML does not carry is refused with
  // "Active piping material evidence is missing".
  const receipts = new Set(
    DEMO_MANIFEST.references.pipingMaterialRecords
      .filter((record) => record.status === "active")
      .map((record) => `${record.identCode}|${record.heatNumber}`),
  )

  for (const isoNumber of SHOWCASE_ISO_NUMBERS) {
    const rows = buildShowcaseSpoolgenFiles(isoNumber)
      .trace.trim()
      .split("\n")
      .slice(1)
      .map((row) => row.split("\t"))
    assert.ok(rows.length > 0, `${isoNumber} has no material lines`)
    for (const row of rows) {
      assert.ok(
        receipts.has(`${row[2]}|${row[6]}`),
        `${isoNumber} ${row[1]}: no active PML receipt for ${row[2]} / ${row[6]}`,
      )
    }
  }
})

test("every spool's ladder dates are non-decreasing, which the commands enforce", () => {
  // release_quality_record refuses "The release date cannot precede the fabrication completion
  // date"; record_laydown refuses a spool without a final QC. Ordering is therefore a hard
  // requirement, not presentation.
  for (const spool of buildShowcaseProgressPlan(BASE).spools) {
    const startFab = spool.stages.find((stage) => stage.stage === "start_fab")
    const lastWeld = spool.weldedJoints.at(-1)?.weldedOn
    const sentToPaint = spool.stages.find((stage) => stage.stage === "sent_to_paint")
    const sequence = [
      startFab?.occurredOn,
      spool.materialCheckOn,
      lastWeld,
      spool.supportsInstalledOn,
      spool.qualityReleaseOn,
      sentToPaint?.occurredOn,
      spool.paintedOn,
      spool.finalQcOn,
      spool.laydownOn,
      ...spool.stages
        .filter((stage) => stage.phase === "erection")
        .map((stage) => stage.occurredOn),
    ].filter((date): date is string => date !== undefined)

    for (let index = 1; index < sequence.length; index += 1) {
      assert.ok(
        Date.parse(sequence[index - 1]) <= Date.parse(sequence[index]),
        `${spool.spoolNumber}: ${sequence[index - 1]} then ${sequence[index]} is out of order`,
      )
    }
  }
})

test("no field weld is queued for shop weld progress", () => {
  // record_weld_progress refuses a field joint outright, so a field weld in weldedJoints would
  // abort the seed part-way and leave a half-built stand.
  const fieldWeldNumbers = new Set(
    SHOWCASE_ISO_NUMBERS.flatMap((iso) =>
      weldRows(iso)
        .filter((row) => row[10] === "field")
        .map((row) => row[8]),
    ),
  )
  assert.ok(fieldWeldNumbers.size > 0, "the dataset has no field welds at all")

  for (const spool of buildShowcaseProgressPlan(BASE).spools) {
    for (const joint of spool.weldedJoints) {
      assert.equal(
        fieldWeldNumbers.has(joint.weldNumber),
        false,
        `${joint.weldNumber} is a field weld and cannot go through record_weld_progress`,
      )
    }
  }
})

test("the welder rotation advances so work spreads across the qualified pool", () => {
  const joints = buildShowcaseProgressPlan(BASE).spools.flatMap(
    (spool) => spool.weldedJoints,
  )

  assert.ok(joints.length > 0)
  // Rotation is dense and strictly increasing, so any pool size the seeder finds is exercised
  // evenly. The seeder derives root and cap from consecutive positions, which is what keeps them
  // different welders — weld_point_assignments is unique on (record, welder).
  assert.deepEqual(
    joints.map((joint) => joint.welderRotation),
    joints.map((_joint, index) => index),
  )
})

test("weld numbers are unique across the whole dataset", () => {
  const weldNumbers = SHOWCASE_ISO_NUMBERS.flatMap((iso) =>
    weldRows(iso).map((row) => row[8]),
  )

  assert.equal(new Set(weldNumbers).size, weldNumbers.length)
  assert.equal(weldNumbers.length, SHOWCASE_EXPECTED_COUNTS.weldJointRevisions)
})
