import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { buildTrack09FixturePlan, isLocalhost, TRACK09_JOINTER_CODES, TRACK09_PREFIX, TRACK09_PROJECT_CODE } from "./bootstrap-track09-browser-fixtures"

assert.equal(isLocalhost("http://127.0.0.1:54321"), true)
assert.equal(isLocalhost("https://example.supabase.co"), false)
assert.equal(TRACK09_PROJECT_CODE, "TRACK01-A")
assert.match(TRACK09_PREFIX, /^T9-/)
assert.equal(TRACK09_JOINTER_CODES.length, 2)
const plan = buildTrack09FixturePlan("project-09")
assert.equal(plan.category.category_code, "T9-X")
assert.equal(plan.unitTime.activity, "FLANGE_JOINTING")
assert.equal(plan.jointers.length, 2)
assert.ok(plan.jointers.every((row) => row.code.startsWith(TRACK09_PREFIX)))
const source = readFileSync(new URL("./bootstrap-track09-browser-fixtures.ts", import.meta.url), "utf8")
assert.match(source, /Refusing to run against a non-local Supabase URL/)
assert.match(source, /upsert/)
assert.match(source, /bolt\.txt/)
assert.doesNotMatch(source, /db reset|readFileSync\([^)]*\.env/) 
