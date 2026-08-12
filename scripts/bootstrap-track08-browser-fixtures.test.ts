import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { parseSheet } from "../modules/imports/domain/parsers/registry"
import { TRACK08_SPOOLS, buildTrack08FixturePlan, isLocalhost } from "./bootstrap-track08-browser-fixtures"

assert.equal(isLocalhost("http://127.0.0.1:54321"), true)
assert.equal(isLocalhost("http://localhost:54321"), true)
assert.equal(isLocalhost("https://example.supabase.co"), false)

const plan = buildTrack08FixturePlan("project", "admin", "operator", "area")
assert.equal(plan.locations.length, 3)
assert.equal(plan.locations.find((row) => row.code === "T8-LEGACY")?.capacity, null)
assert.equal(plan.devices.length, 2)
assert.deepEqual(Object.values(TRACK08_SPOOLS).sort(), ["SP-T8-ACTIVE", "SP-T8-ERECTED", "SP-T8-OVERDUE", "SP-T8-TRANSIT"].sort())
assert.deepEqual(plan.eventTimes, ["2026-08-01T08:00:00Z", "2026-08-01T09:00:00Z", "2026-08-02T10:00:00Z"])

const text = readFileSync(join(__dirname, "tracking-scans.txt"), "utf8").trim()
const matrix = text.split("\n").map((line) => line.split("\t"))
const parsed = parseSheet("tracking_scan", matrix)
assert.equal(parsed.rows.length, 3)
assert.equal(parsed.issues.filter((issue) => issue.code === "TRACKING_DIRECTION").length, 1)
assert.equal(parsed.rows[0]?.normalizedValues.external_event_id, parsed.rows[1]?.normalizedValues.external_event_id)

const validText = readFileSync(join(__dirname, "tracking-scans-valid.txt"), "utf8").trim()
const valid = parseSheet("tracking_scan", validText.split("\n").map((line) => line.split("\t")))
assert.equal(valid.issues.length, 0)
assert.equal(valid.rows.length, 2)
