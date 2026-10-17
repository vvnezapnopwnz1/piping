import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The shop weld step listed every joint of the spool, so the erection joint (FW1) showed up under
// "Shop weld joints" with a "field" status. Manual 7.3: the fabrication weld screen shows shop joints only.
const source = readFileSync(new URL("./weld-progress-screen.tsx", import.meta.url), "utf8")

test("every load of the shop weld table asks for shop joints only", () => {
  const calls = source.split("\n").filter((line) => line.includes("loadWeldSummaries("))
  assert.ok(calls.length >= 2)
  for (const call of calls) assert.match(call, /"shop"/, call)
})
