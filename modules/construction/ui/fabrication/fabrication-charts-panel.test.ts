import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { en } from "@/i18n/messages"

const source = readFileSync(
  new URL("./fabrication-charts-panel.tsx", import.meta.url),
  "utf8",
)
const charts = en.fabrication.charts

assert.match(source, /<ChartContainer/)
// Each chart and the empty state keep their own words, now in the messages.
for (const [key, text] of [
  ["cumulativeFabricationProgress", /Cumulative fabrication progress/],
  ["stageDistribution", /Stage distribution/],
  ["progressByPdsArea", /Progress by PDS area/],
  ["noFabricationProgressRecordedYet", /No fabrication progress recorded yet\./],
] as const) {
  assert.match(source, new RegExp(`t\\("${key}"\\)`))
  assert.match(charts[key], text)
}
