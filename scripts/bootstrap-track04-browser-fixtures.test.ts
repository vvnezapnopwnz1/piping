import assert from "node:assert/strict"
import { buildTrack04FixturePlan, isLocalhost, planInsertCount } from "./bootstrap-track04-browser-fixtures"
assert.equal(isLocalhost("http://127.0.0.1:54321"), true); assert.equal(isLocalhost("https://abc.supabase.co"), false)
const plan = buildTrack04FixturePlan("p", "mat", "sc", "wt")
assert.ok(plan.pdsAreas.some((row) => row.code === "PDS-T4")); assert.ok(plan.serviceClasses.some((row) => row.code === "SC-T4")); assert.ok(plan.weldTypes.some((row) => row.code === "BW-T4")); assert.ok(plan.thicknessRules.length > 0); assert.ok(plan.ndeMatrixRules.every((row) => row.weld_location === "shop")); assert.equal(planInsertCount(plan), 6)
