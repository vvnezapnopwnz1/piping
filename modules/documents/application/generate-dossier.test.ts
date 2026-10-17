import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import type { DocumentChrome, DocumentHeader } from "../domain/document"
import { dossier, dossierLabels } from "../domain/dossier-fixtures.test"
import { generateTestPackDossier, type GenerateDossierInput } from "./generate-dossier"

const header: DocumentHeader = {
  title: "Сдаточное досье тест-пакета",
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

const fonts = async () => ({
  regular: new Uint8Array(readFileSync("public/fonts/PTSans-Regular.ttf")),
  bold: new Uint8Array(readFileSync("public/fonts/PTSans-Bold.ttf")),
})

function input(format: "pdf" | "xlsx"): GenerateDossierInput {
  return { format, projectId: "project-1", testPackId: "tp-1", header, chrome, labels: dossierLabels, fonts }
}

test("the dossier file is named after the project, the pack and the day", async () => {
  const pdf = await generateTestPackDossier({ loadTestPackDossier: async () => dossier() }, input("pdf"))
  assert.ok(pdf.ok)
  assert.equal(pdf.value.fileName, "UPG-1-test-pack-dossier-TP-100-01-2026-10-18.pdf")
  assert.equal(pdf.value.blob.type, "application/pdf")

  const xlsx = await generateTestPackDossier({ loadTestPackDossier: async () => dossier() }, input("xlsx"))
  assert.ok(xlsx.ok)
  assert.equal(xlsx.value.fileName, "UPG-1-test-pack-dossier-TP-100-01-2026-10-18.xlsx")
})

test("a pack the reader cannot see is reported as a failure, not an empty dossier", async () => {
  const result = await generateTestPackDossier({ loadTestPackDossier: async () => null }, input("pdf"))
  assert.deepEqual(result, { ok: false, reason: "failed" })
})
