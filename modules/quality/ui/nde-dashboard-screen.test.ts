import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("./nde-dashboard-screen.tsx", import.meta.url), "utf8")

assert.ok(source.includes("loadNdeChartData"), "the NDE dashboard must load charts independently from KPIs")
assert.ok(source.includes("NdeChartsPanel"), "the NDE dashboard must render the chart panel")
