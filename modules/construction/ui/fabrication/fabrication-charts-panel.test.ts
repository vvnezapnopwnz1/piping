import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync(
  new URL("./fabrication-charts-panel.tsx", import.meta.url),
  "utf8",
)

assert.match(source, /<ChartContainer/)
assert.match(source, /Cumulative fabrication progress/)
assert.match(source, /Stage distribution/)
assert.match(source, /Progress by PDS area/)
assert.match(source, /No fabrication progress recorded yet\./)
