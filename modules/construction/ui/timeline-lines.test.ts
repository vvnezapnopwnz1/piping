import { test } from "node:test"
import assert from "node:assert/strict"
import { timelineLines } from "./timeline-lines"

test("a line that only repeats the step title is dropped", () => {
  assert.deepEqual(timelineLines("QC release", [{ label: "QC Release", value: null }]), [])
  assert.deepEqual(timelineLines("Welded / Bolted", [{ label: "Welded/Bolted", value: "2026-08-24" }]), [])
})

test("lines that add information stay", () => {
  const lines = [{ label: "Start Fab", value: "2026-08-25" }, { label: "Material Check", value: "2026-08-27" }]
  assert.deepEqual(timelineLines("Material", lines), lines)
})
