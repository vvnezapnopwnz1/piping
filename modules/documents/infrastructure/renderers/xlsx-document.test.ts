import assert from "node:assert/strict"
import test from "node:test"

import * as XLSX from "xlsx"

import type { DocumentChrome, DocumentHeader } from "../../domain/document"
import { documentSheet, xlsxBlob } from "./xlsx-document"

const header: DocumentHeader = {
  title: "Журнал сварочных работ",
  projectCode: "UPG-1",
  projectTitle: "Установка подготовки газа",
  generatedAt: new Date("2026-10-18T09:30:00Z"),
  author: "Иванов И. И.",
  locale: "ru",
}

const chrome: DocumentChrome = {
  generatedLabel: "Срез",
  authorLabel: "Сформировал",
  page: (n, total) => `стр. ${n} из ${total}`,
  noRecords: "Записей нет",
}

async function readBack(blob: Blob): Promise<XLSX.WorkSheet> {
  const workbook = XLSX.read(new Uint8Array(await blob.arrayBuffer()), { type: "array" })
  return workbook.Sheets[workbook.SheetNames[0]]
}

test("xlsx keeps Cyrillic and puts the table under a four-line header", async () => {
  const sheet = documentSheet(header, chrome, { head: ["Стык", "Дата"], body: [["W-1", "01.10.2026"]] })

  const read = await readBack(xlsxBlob([{ name: "Журнал", sheet }]))

  assert.equal(read.A1.v, "Журнал сварочных работ")
  assert.match(String(read.A2.v), /UPG-1.*Установка подготовки газа/)
  assert.match(String(read.A3.v), /^Срез/)
  assert.match(String(read.A4.v), /^Сформировал: Иванов И\. И\./)
  assert.equal(read.A5, undefined)
  assert.equal(read.A6.v, "Стык")
  assert.equal(read.B7.v, "01.10.2026")
})

test("xlsx prints the no-records label for an empty table", async () => {
  const sheet = documentSheet(header, chrome, { head: ["№", "Описание"], body: [] })

  const read = await readBack(xlsxBlob([{ name: "Замечания", sheet }]))

  assert.equal(read.A7.v, "Записей нет")
})
