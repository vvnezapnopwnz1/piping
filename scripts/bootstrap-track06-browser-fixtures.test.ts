import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  TRACK06_CAP_WELDER,
  TRACK06_ROOT_WELDER,
  buildTrack06FixturePlan,
  buildWeldPoints,
  isLocalhost,
  parseWeldFixture,
} from "./bootstrap-track06-browser-fixtures"

assert.equal(isLocalhost("http://127.0.0.1:54321"), true)
assert.equal(isLocalhost("https://abc.supabase.co"), false)

const plan = buildTrack06FixturePlan("project-1", "sub-1", "wps-1")

assert.equal(plan.welders.length, 2)
assert.ok(plan.welders.every((row) => row.subcontractor_id === "sub-1"))
assert.equal(plan.welderWpsLinks.length, 2)

// The escalation is keyed on (project, welder). Track 06's welders must not be Track 05's,
// or an NDE100 escalation raised on this population would rewrite the coverage of the
// SP-T4-001-A joints the Track 05 golden path depends on.
assert.ok(
  plan.welders.every((row) => row.welder_code !== "W-T5-1" && row.welder_code !== "W-T5-2"),
  "Track 06 welders must be disjoint from Track 05's",
)

const points = buildWeldPoints("root-welder", "cap-welder", "2026-08-04")
assert.equal(points.length, 2)
assert.equal(
  points.reduce((total, point) => total + point.completion_percent, 0),
  100,
  "record_weld_progress raises PQC35 unless root and cap total exactly 100",
)
assert.notEqual(
  points[0].welder_qualification_id,
  points[1].welder_qualification_id,
  "each weld point of a joint needs a different welder",
)
assert.ok(points.every((point) => point.welded_on === "2026-08-04"))

const fixture = parseWeldFixture(readFileSync(join(__dirname, "weld-t6.txt"), "utf8"))

// Four rejections inside one batch is what evaluate_nde_penalty counts, and each
// rejection consumes up to two further joints as tracers. A population this size is the
// reason the Track 06 walk can reach the escalation banner at all - Track 05's three
// joints cannot.
assert.ok(fixture.length >= 12, `the Track 06 population needs at least 12 joints, has ${fixture.length}`)

assert.ok(
  fixture.every((row) => row.weldLocation === "shop"),
  "spool_fabrication_readiness counts shop joints only",
)

// One matrix rule for the whole population: same service class and weld type as Track 05's
// SC-T4/BW-T4/shop rule, which carries rt_coverage 10 - so every obligation starts as a
// 10 % spot obligation and a spot batch has something to sample.
assert.equal(new Set(fixture.map((row) => row.serviceClass)).size, 1)
assert.equal(new Set(fixture.map((row) => row.weldType)).size, 1)

// Below the 8 mm PWHT threshold the Track 05 bootstrap writes, so no Track 06 joint
// generates a PWHT requirement. The PWHT gate stays proven where it already is, on
// SP-T4-001-A's 8.2 mm joints, and this population stays purely about NDE.
assert.ok(
  fixture.every((row) => row.thicknessMm < 8),
  "Track 06 joints must stay under the PWHT thickness threshold",
)

// Weld numbers are unique and sort in the order allocate_nde_batch_candidates returns
// them, so a walkthrough can name the joints it expects to be allocated.
const weldNumbers = fixture.map((row) => row.weldNumber)
assert.equal(new Set(weldNumbers).size, weldNumbers.length)
assert.deepEqual(weldNumbers, [...weldNumbers].sort())

// Two spools, so the walk can show that an NDE population spans spools while the
// fabrication readiness that consumes it does not.
assert.ok(new Set(fixture.map((row) => row.spoolNumber)).size >= 2)

assert.equal(TRACK06_ROOT_WELDER, "W-T6-1")
assert.equal(TRACK06_CAP_WELDER, "W-T6-2")

// Every bill-of-materials spool must exist in weld-t6.txt, or the import refuses the whole
// job with an ORPHAN_SPOOL blocker. Each spool needs at least one line: the readiness view
// treats a spool with no bill as never material-checked.
const traceLines = readFileSync(join(__dirname, "trace-t6.txt"), "utf8")
  .split("\n")
  .filter((line) => line.trim().length > 0)
  .slice(1)
  .map((line) => line.split("\t"))
const weldSpools = new Set(fixture.map((row) => row.spoolNumber))
const billedSpools = new Set(traceLines.map((cells) => cells[1]))
for (const spool of billedSpools) {
  assert.ok(weldSpools.has(spool), `trace-t6.txt bills spool ${spool}, absent from weld-t6.txt`)
}
for (const spool of weldSpools) {
  assert.ok(billedSpools.has(spool), `weld-t6.txt spool ${spool} has no bill of materials`)
}
