import assert from "node:assert/strict"
import test from "node:test"

import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"
import {
  SHOWCASE_EXPECTED_COUNTS,
  SHOWCASE_ISO_NUMBERS,
  SHOWCASE_WEEK_COUNT,
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
  const partiallyWelded = plan.spools.filter(
    (spool) =>
      spool.weldedJoints.length > 0 &&
      spool.weldedJoints.length < SHOWCASE_EXPECTED_COUNTS.weldJointRevisions /
        SHOWCASE_EXPECTED_COUNTS.spoolRevisions,
  )

  assert.ok(
    partiallyWelded.length >= 3,
    "no spool is left mid-welding, so nothing is safely editable",
  )
  assert.ok(
    partiallyWelded.every((spool) => spool.qualityReleaseOn === undefined),
    "a partially welded spool cannot carry a quality release",
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

test("weld numbers are unique across the whole dataset", () => {
  const weldNumbers = SHOWCASE_ISO_NUMBERS.flatMap((iso) =>
    weldRows(iso).map((row) => row[8]),
  )

  assert.equal(new Set(weldNumbers).size, weldNumbers.length)
  assert.equal(weldNumbers.length, SHOWCASE_EXPECTED_COUNTS.weldJointRevisions)
})
