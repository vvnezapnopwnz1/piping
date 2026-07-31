import assert from "node:assert/strict"
import { buildTrack02FixturePlan, isLocalhost } from "./bootstrap-track02-browser-fixtures"

// Host safety test
assert.equal(isLocalhost("http://127.0.0.1:54321"), true)
assert.equal(isLocalhost("http://localhost:54321"), true)
assert.equal(isLocalhost("https://production-db.supabase.co"), false)

// Fixture plan shape test
const plan = buildTrack02FixturePlan()
assert.equal(plan.projects.length, 2)
assert.equal(plan.projects[0].code, "TRACK01-A")
assert.equal(plan.projects[1].code, "TRACK01-B")
assert.equal(plan.weldTypes.length, 2)

console.log("All bootstrap-track02-browser-fixtures.test.ts assertions passed!")
