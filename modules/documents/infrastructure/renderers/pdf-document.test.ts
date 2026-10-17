import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import type { jsPDF } from "jspdf"

import type { DocumentChrome, DocumentHeader } from "../../domain/document"
import { createPdf, drawSection, finishPdf, type PdfFonts } from "./pdf-document"

const fonts: PdfFonts = {
  regular: new Uint8Array(readFileSync("public/fonts/PTSans-Regular.ttf")),
  bold: new Uint8Array(readFileSync("public/fonts/PTSans-Bold.ttf")),
}

const header: DocumentHeader = {
  title: "Журнал сварочных работ",
  projectCode: "UPG-1",
  projectTitle: "Установка подготовки газа",
  generatedAt: new Date("2026-10-18T09:30:00Z"),
  author: "Иванов И. И.",
  locale: "ru",
}

function chromeRecording(pages: Array<[number, number]>): DocumentChrome {
  return {
    generatedLabel: "Срез",
    authorLabel: "Сформировал",
    page: (n, total) => {
      pages.push([n, total])
      return `стр. ${n} из ${total}`
    },
    noRecords: "Записей нет",
  }
}

/** Records every string the document draws, through jsPDF's own `text`. */
function recordTexts(doc: jsPDF): string[] {
  const texts: string[] = []
  const draw = doc.text.bind(doc)
  doc.text = ((text: string | string[], ...rest: unknown[]) => {
    texts.push(...(Array.isArray(text) ? text : [text]))
    return (draw as (...args: unknown[]) => jsPDF)(text, ...rest)
  }) as jsPDF["text"]
  return texts
}

test("pdf embeds PT Sans and every text run uses it", async () => {
  const doc = createPdf(fonts, "landscape", "ru")
  const texts = recordTexts(doc)
  drawSection(doc, header.title, { head: ["Стык", "Дата"], body: [["W-1", "01.10.2026"]] }, chromeRecording([]))
  const ptSans = new Set(["normal", "bold"].map((style) => String(doc.setFont("PTSans", style).getFont().id)))

  const pdf = new TextDecoder("latin1").decode(await finishPdf(doc, header, chromeRecording([])).arrayBuffer())

  assert.match(pdf, /\/FontFile2/)
  const used = new Set([...pdf.matchAll(/\/(F\d+) [\d.]+ Tf/g)].map((match) => match[1]))
  assert.ok(used.size > 0)
  for (const id of used) assert.ok(ptSans.has(id), `text run uses ${id}, not PT Sans`)
  assert.ok(texts.includes("Журнал сварочных работ"))
  assert.ok(texts.some((text) => text.includes("Иванов И. И.")))
})

test("finishPdf numbers every page", () => {
  const pages: Array<[number, number]> = []
  const doc = createPdf(fonts, "landscape", "ru")
  const body = Array.from({ length: 120 }, (_, index) => [`W-${index + 1}`, "01.10.2026"])
  drawSection(doc, header.title, { head: ["Стык", "Дата"], body }, chromeRecording([]))

  finishPdf(doc, header, chromeRecording(pages))

  const total = doc.getNumberOfPages()
  assert.ok(total > 1)
  assert.deepEqual(pages, Array.from({ length: total }, (_, index) => [index + 1, total]))
})

test("drawSection prints the no-records label for an empty table", () => {
  const doc = createPdf(fonts, "portrait", "ru")
  const texts = recordTexts(doc)

  drawSection(doc, "Замечания", { head: ["№", "Описание"], body: [] }, chromeRecording([]))

  assert.ok(texts.includes("Записей нет"))
})

test("drawSection prints numbers in the reader's format", () => {
  const doc = createPdf(fonts, "landscape", "ru")
  const texts = recordTexts(doc)

  drawSection(doc, "Стыки", { head: ["Стык", "Толщина, мм"], body: [["W-1", 6.02]] }, chromeRecording([]))

  assert.ok(texts.includes("6,02"))
})
