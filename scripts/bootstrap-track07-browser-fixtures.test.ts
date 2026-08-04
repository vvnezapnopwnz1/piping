import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  TRACK07_CAP_WELDER,
  TRACK07_ISO,
  TRACK07_ROOT_WELDER,
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
assert.equal(fixture.length, 1)
assert.equal(fixture[0].weldLocation, "field")
assert.equal(fixture[0].isoNumber, TRACK07_ISO)
assert.equal(fixture[0].weldNumber, "W-T7-001")
