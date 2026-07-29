import assert from "node:assert/strict"
import { parseAppMode } from "./app-mode"

assert.equal(parseAppMode(undefined), "demo")
assert.equal(parseAppMode("demo"), "demo")
assert.equal(parseAppMode("supabase"), "supabase")
assert.equal(parseAppMode("SUPABASE"), "demo")
