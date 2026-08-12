import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  TRACK07_CAP_WELDER,
  TRACK07_GATE_SPOOL,
  TRACK07_ISO,
  TRACK07_ROOT_WELDER,
  TRACK07_WALK_SPOOL,
  buildTrack07FixturePlan,
  buildTrack07WeldPoints,
  isLocalhost,
  parseTrack07WeldFixture,
} from "./bootstrap-track07-browser-fixtures"

assert.equal(isLocalhost("http://127.0.0.1:54321"), true)
assert.equal(isLocalhost("https://example.supabase.co"), false)
assert.equal(TRACK07_ISO, "ISO-T7-001")
assert.notEqual(TRACK07_ROOT_WELDER, "W-T5-1")
assert.notEqual(TRACK07_CAP_WELDER, "W-T5-2")

const plan = buildTrack07FixturePlan("project-1", "sub-1", "wps-1", "service-1", "weld-1", "category-1")
assert.equal(plan.welders.length, 2)
assert.ok(plan.welders.every((row) => row.subcontractor_id === "sub-1"))
assert.equal(plan.fieldNdeRule.weld_location, "field")
assert.equal(plan.locations[0].code, "SITE-T7")

const points = buildTrack07WeldPoints("root", "cap", "2026-08-10")
assert.equal(points.reduce((sum, point) => sum + point.completion_percent, 0), 100)
assert.notEqual(points[0].welder_qualification_id, points[1].welder_qualification_id)

const fixture = parseTrack07WeldFixture(readFileSync(join(__dirname, "weld-t7.txt"), "utf8"))
assert.equal(fixture.length, 2)
assert.ok(fixture.every((row) => row.weldLocation === "field"))
assert.ok(fixture.every((row) => row.isoNumber === TRACK07_ISO))
assert.deepEqual(
  fixture.map((row) => row.spoolNumber),
  [TRACK07_WALK_SPOOL, TRACK07_GATE_SPOOL],
)
assert.deepEqual(
  fixture.map((row) => row.weldNumber),
  ["W-T7-001", "W-T7-002"],
)

// The walk spool must carry supports, and the gate spool must not be advanced by the bootstrap.
// Both facts are what make the Supported table and the To Site precondition walkable.
const supp = readFileSync(join(__dirname, "supp-t7.txt"), "utf8").trim().split("\n")
assert.equal(supp[0].split("\t")[0], "ISO_NUMBER")
assert.equal(supp.length - 1, 2)
assert.ok(supp.slice(1).every((line) => line.split("\t")[1] === TRACK07_WALK_SPOOL))

const bootstrapSource = readFileSync(join(__dirname, "bootstrap-track07-browser-fixtures.ts"), "utf8")
assert.ok(
  bootstrapSource.includes("spool_number === TRACK07_WALK_SPOOL"),
  "the bootstrap must seed To Site only on the walk spool",
)

// Both spools share one bill-of-materials ident code, so the field material check has a line to
// confirm on either of them.
const trace = readFileSync(join(__dirname, "trace-t7.txt"), "utf8").trim().split("\n")
assert.deepEqual(
  trace.slice(1).map((line) => line.split("\t")[1]),
  [TRACK07_WALK_SPOOL, TRACK07_GATE_SPOOL],
)
