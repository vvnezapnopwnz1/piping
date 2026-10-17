import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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

const fonts = async () => ({
  regular: new Uint8Array(readFileSync("public/fonts/PTSans-Regular.ttf")),
  bold: new Uint8Array(readFileSync("public/fonts/PTSans-Bold.ttf")),
})

function input(code: string, format: "xlsx" | "pdf" = "xlsx"): GenerateDocumentInput {
  return { code, format, projectId: "project-1", header, chrome, labels, fonts }
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

test("every project register also comes out as a PDF with PT Sans", async () => {
  for (const [code, stem] of [["RPT-W-001", "weld-log"], ["RPT-N-001", "nde-register"], ["RPT-P-001", "punch-register"], ["RPT-T-002", "test-pack-summary"]]) {
    const result = await generateDocument(repository(), input(code, "pdf"))

    assert.ok(result.ok, code)
    assert.equal(result.value.fileName, `UPG-1-${stem}-2026-10-18.pdf`)
    assert.equal(result.value.blob.type, "application/pdf")
    const pdf = new TextDecoder("latin1").decode(await result.value.blob.arrayBuffer())
    assert.match(pdf, /\/BaseFont \/PTSans/, code)
  }
})
