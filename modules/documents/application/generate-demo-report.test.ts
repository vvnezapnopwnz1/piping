import assert from "node:assert/strict"
import test from "node:test"

import type { FabricationProgressSnapshot, TestPackRftSnapshot } from "../domain/report"
import { generateDemoReport, type DemoReportRepository } from "./generate-demo-report"

const fabricationSnapshot: FabricationProgressSnapshot = {
  projectCode: "EP-100",
  generatedAt: new Date("2026-08-09T10:00:00Z"),
  rows: [],
}
const testPackSnapshot: TestPackRftSnapshot = { ...fabricationSnapshot, rows: [] }

const repository: DemoReportRepository = {
  loadFabricationProgress: async () => fabricationSnapshot,
  loadTestPackRft: async () => testPackSnapshot,
}

test("generateDemoReport returns the real fabrication artifact only after its snapshot loads", async () => {
  const result = await generateDemoReport(repository, {
    code: "RPT-F-001", projectId: "project-a", projectCode: "EP-100", generatedAt: fabricationSnapshot.generatedAt,
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.fileName, "EP-100-fabrication-progress-2026-08-09.xlsx")
  assert.equal(result.value.blob.type, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
})

test("generateDemoReport returns a visible failure when snapshot loading fails", async () => {
  const result = await generateDemoReport({
    ...repository,
    loadTestPackRft: async () => { throw new Error("read denied") },
  }, {
    code: "RPT-T-001", projectId: "project-a", projectCode: "EP-100", generatedAt: fabricationSnapshot.generatedAt,
  })

  assert.deepEqual(result, { ok: false, reason: "read denied" })
})

test("generateDemoReport rejects codes outside the Demo Lite registry", async () => {
  const result = await generateDemoReport(repository, {
    code: "RPT-N-001", projectId: "project-a", projectCode: "EP-100", generatedAt: fabricationSnapshot.generatedAt,
  })

  assert.deepEqual(result, { ok: false, reason: "Unknown report: RPT-N-001" })
})
