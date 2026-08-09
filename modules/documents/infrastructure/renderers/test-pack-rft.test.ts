import assert from "node:assert/strict"
import test from "node:test"

import type { TestPackRftSnapshot } from "../../domain/report"
import { renderTestPackRft } from "./test-pack-rft"

const snapshot: TestPackRftSnapshot = {
  projectCode: "EP-100",
  generatedAt: new Date("2026-08-09T10:00:00Z"),
  rows: [{
    testPackNumber: "TP-1", lifecycle: "active", isRft: false, rftOn: null,
    memberCount: 2, spoolTotal: 3, weldOrSupportPendingCount: 2, ndePendingCount: 1,
    pwhtPendingCount: 0, flangePendingCount: 1, lineCheckPendingCount: 1, xOpenCount: 0,
  }],
}

test("test pack renderer creates a PDF containing readiness and blocker evidence", async () => {
  const blob = renderTestPackRft(snapshot)
  assert.equal(blob.type, "application/pdf")

  const pdfText = new TextDecoder().decode(await blob.arrayBuffer())
  assert.match(pdfText, /Test Pack RFT Pursuit/)
  assert.match(pdfText, /TP-1/)
  assert.match(pdfText, /Blocked/)
  assert.match(pdfText, /NDE: 1/)
})

test("test pack renderer creates a readable empty-project PDF", async () => {
  const blob = renderTestPackRft({ ...snapshot, rows: [] })
  const pdfText = new TextDecoder().decode(await blob.arrayBuffer())
  assert.match(pdfText, /No Test Packs in this project\./)
})
