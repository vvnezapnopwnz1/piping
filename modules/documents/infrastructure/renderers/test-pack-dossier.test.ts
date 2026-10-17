import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import * as XLSX from "xlsx"

import type { DocumentChrome, DocumentHeader } from "../../domain/document"
import { dossier, dossierLabels } from "../../domain/dossier-fixtures.test"
import { obligation, punch, weld } from "../../domain/register-fixtures.test"
import { renderTestPackDossierPdf, renderTestPackDossierXlsx } from "./test-pack-dossier"

const fonts = {
  regular: new Uint8Array(readFileSync("public/fonts/PTSans-Regular.ttf")),
  bold: new Uint8Array(readFileSync("public/fonts/PTSans-Bold.ttf")),
}

const header: DocumentHeader = {
  title: "Сдаточное досье тест-пакета TP-100-01",
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

const full = dossier({
  welds: [weld(), weld({ weldJointRevisionId: "w2", weldNumber: "W-2", weldLocation: "field" })],
  nde: [obligation()],
  punch: [punch()],
})

test("dossier PDF uses PT Sans for every text run and spans several pages", async () => {
  const blob = renderTestPackDossierPdf(full, fonts, header, chrome, dossierLabels)
  assert.equal(blob.type, "application/pdf")

  const pdf = new TextDecoder("latin1").decode(await blob.arrayBuffer())
  const fontIds = new Set([...pdf.matchAll(/\/F(\d+) [\d.]+ Tf/g)].map((match) => Number(match[1])))
  assert.ok(fontIds.size > 0)
  assert.match(pdf, /\/BaseFont \/PTSans/)
  assert.ok((pdf.match(/\/Type \/Page\b/g) ?? []).length >= 3, "title, act and tables start on their own pages")
  // jsPDF numbers its 14 built-in fonts F1–F14; PT Sans is registered after them.
  for (const id of fontIds) assert.ok(id > 14, `text run uses built-in font F${id}`)
})

test("an empty untested pack still builds a dossier", async () => {
  const empty = dossier({ isos: [], pack: { testingStartedOn: null, testingCompletedOn: null, isRft: false } })

  const blob = renderTestPackDossierPdf(empty, fonts, header, chrome, dossierLabels)

  assert.ok(blob.size > 0)
})

test("dossier XLSX has the pack, composition, weld history, NDE and punch sheets without the act", async () => {
  const blob = renderTestPackDossierXlsx(full, header, chrome, dossierLabels)

  const workbook = XLSX.read(new Uint8Array(await blob.arrayBuffer()), { type: "array" })
  assert.deepEqual(workbook.SheetNames, ["Тест-пакет", "Состав", "Weld History", "NDE", "Замечания X"])
  const weldHistory = workbook.Sheets["Weld History"]
  assert.equal(weldHistory.C7.v, "W-1")
  assert.equal(weldHistory.C8.v, "W-2")
})
