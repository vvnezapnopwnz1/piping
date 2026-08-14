import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("./nde-charts-panel.tsx", import.meta.url), "utf8")

assert.match(source, /<ChartContainer/)
assert.match(source, /Weekly examination outcomes/)
assert.match(source, /Inspection workflow/)
assert.match(source, /NDT method distribution/)
assert.match(source, /No NDE activity recorded yet\./)
