import assert from "node:assert/strict"
import test from "node:test"

import * as XLSX from "xlsx"

import type { DocumentChrome, DocumentHeader } from "../domain/document"
import { labels, weld } from "../domain/register-fixtures.test"
import { generateDocument, type DocumentRepository, type GenerateDocumentInput } from "./generate-document"

const header: DocumentHeader = {
  title: "Журнал сварочных работ",
  projectCode: "UPG-1",
  projectTitle: "Установка подготовки газа",
  generatedAt: new Date("2026-10-18T10:00:00Z"),
  author: "Иванов И. И.",
  locale: "ru",
}

const chrome: DocumentChrome = {
  generatedLabel: "Срез",
  authorLabel: "Сформировал",
  page: (n, total) => `стр. ${n} из ${total}`,
  noRecords: "Записей нет",
}

function repository(overrides: Partial<DocumentRepository> = {}): DocumentRepository {
  return {
    loadWeldLog: async () => [weld()],
    loadNdeRegister: async () => [],
    loadPunchRegister: async () => [],
    loadTestPackSummary: async () => [],
    ...overrides,
  }
}

function input(code: string): GenerateDocumentInput {
  return { code, format: "xlsx", projectId: "project-1", header, chrome, labels }
}

test("an unknown document code is refused", async () => {
  assert.deepEqual(await generateDocument(repository(), input("RPT-F-001")), { ok: false, reason: "unknownReport" })
})

test("a loader error surfaces as a failure with its message", async () => {
  const result = await generateDocument(
    repository({ loadWeldLog: async () => { throw new Error("read denied") } }),
    input("RPT-W-001"),
  )
  assert.deepEqual(result, { ok: false, reason: "failed", detail: "read denied" })
})

test("the weld log comes out as an XLSX named after the project and the day", async () => {
  const result = await generateDocument(repository(), input("RPT-W-001"))

  assert.ok(result.ok)
  assert.equal(result.value.fileName, "UPG-1-weld-log-2026-10-18.xlsx")
  const workbook = XLSX.read(new Uint8Array(await result.value.blob.arrayBuffer()), { type: "array" })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  assert.equal(sheet.A1.v, "Журнал сварочных работ")
  assert.equal(sheet.A7.v, "UPG-100-1001")
})
