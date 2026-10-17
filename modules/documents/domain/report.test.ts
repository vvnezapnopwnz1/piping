import assert from "node:assert/strict"
import test from "node:test"

import { buildReportFileName, DOCUMENT_DEFINITIONS, documentDefinition } from "./report"

test("the document list is the four project registers and the test pack dossier", () => {
  assert.deepEqual(
    DOCUMENT_DEFINITIONS.map((definition) => [definition.code, definition.scope]),
    [
      ["RPT-W-001", "project"],
      ["RPT-N-001", "project"],
      ["RPT-P-001", "project"],
      ["RPT-T-002", "project"],
      ["DOS-T-001", "testPack"],
    ],
  )
  assert.ok(DOCUMENT_DEFINITIONS.every((definition) => definition.requiredCapability === "reports.view"))
})

test("document file names are stable, project-specific and sortable", () => {
  const weldLog = documentDefinition("RPT-W-001")
  assert.ok(weldLog)
  assert.equal(
    buildReportFileName(weldLog, "UPG-1 / Area A", new Date("2026-10-18T10:11:12Z"), "xlsx"),
    "UPG-1-Area-A-weld-log-2026-10-18.xlsx",
  )
  const dossier = documentDefinition("DOS-T-001")
  assert.ok(dossier)
  assert.equal(
    buildReportFileName(dossier, "UPG-1", new Date("2026-10-18T10:11:12Z"), "pdf", "TP-100-01"),
    "UPG-1-test-pack-dossier-TP-100-01-2026-10-18.pdf",
  )
})

test("an unknown code has no definition", () => {
  assert.equal(documentDefinition("RPT-F-001"), undefined)
})
