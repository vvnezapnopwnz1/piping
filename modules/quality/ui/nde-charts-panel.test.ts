import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("./nde-charts-panel.tsx", import.meta.url), "utf8")

assert.match(source, /<ChartContainer/)
assert.match(source, /t\("weeklyExaminationOutcomes"\)/)
assert.match(source, /t\("inspectionWorkflow"\)/)
assert.match(source, /t\("ndtMethodDistribution"\)/)
assert.match(source, /t\("noNdeActivityRecordedYet"\)/)
assert.match(source, /outcomeConfig\(t\)/)
assert.match(source, /methodConfig\(t\)/)
