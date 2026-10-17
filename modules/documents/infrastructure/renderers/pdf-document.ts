import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"

import { headerLines, type DocumentChrome, type DocumentHeader, type DocumentTable } from "../../domain/document"

export interface PdfFonts {
  regular: Uint8Array
  bold: Uint8Array
}

/** Every word goes through PT Sans: jsPDF's built-in fonts have no Cyrillic glyphs. */
const FAMILY = "PTSans"
const MARGIN = 28
const STAMP_HEIGHT = 54
const FOOTER_HEIGHT = 18
const SECTION_GAP = 18

const cursors = new WeakMap<jsPDF, number>()

function base64(bytes: Uint8Array): string {
  let binary = ""
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000))
  }
  return btoa(binary)
}

function contentTop(): number {
  return MARGIN + STAMP_HEIGHT
}

function contentBottom(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight() - MARGIN - FOOTER_HEIGHT
}

export async function loadPdfFonts(fetchImpl: typeof fetch = fetch): Promise<PdfFonts> {
  const read = async (path: string) => {
    const response = await fetchImpl(path)
    if (!response.ok) throw new Error(`Unable to load ${path}`)
    return new Uint8Array(await response.arrayBuffer())
  }
  const [regular, bold] = await Promise.all([read("/fonts/PTSans-Regular.ttf"), read("/fonts/PTSans-Bold.ttf")])
  return { regular, bold }
}

export function createPdf(fonts: PdfFonts, orientation: "portrait" | "landscape"): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation, compress: false })
  doc.addFileToVFS("PTSans-Regular.ttf", base64(fonts.regular))
  doc.addFont("PTSans-Regular.ttf", FAMILY, "normal")
  doc.addFileToVFS("PTSans-Bold.ttf", base64(fonts.bold))
  doc.addFont("PTSans-Bold.ttf", FAMILY, "bold")
  doc.setFont(FAMILY, "normal")
  cursors.set(doc, contentTop())
  return doc
}

/** A section title and its table; the table header repeats on every page it spans. */
export function drawSection(doc: jsPDF, title: string, table: DocumentTable, chrome: DocumentChrome): void {
  let y = cursors.get(doc) ?? contentTop()
  if (y + 60 > contentBottom(doc)) {
    doc.addPage()
    y = contentTop()
  }

  doc.setFont(FAMILY, "bold").setFontSize(11)
  doc.text(title, MARGIN, y)
  doc.setFont(FAMILY, "normal").setFontSize(9)

  if (table.body.length === 0) {
    doc.text(chrome.noRecords, MARGIN, y + 16)
    cursors.set(doc, y + 16 + SECTION_GAP)
    return
  }

  autoTable(doc, {
    head: [table.head],
    body: table.body.map((row) => row.map((cell) => cell ?? "")),
    startY: y + 8,
    margin: { top: contentTop(), bottom: MARGIN + FOOTER_HEIGHT, left: MARGIN, right: MARGIN },
    showHead: "everyPage",
    styles: { font: FAMILY, fontStyle: "normal", fontSize: 8, cellPadding: 3, overflow: "linebreak", textColor: 20 },
    headStyles: { font: FAMILY, fontStyle: "bold", fillColor: [235, 235, 235], textColor: 20 },
  })
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y
  cursors.set(doc, finalY + SECTION_GAP)
}

/** Stamps the document header on top of every page and "page N of M" at the bottom. */
export function finishPdf(doc: jsPDF, header: DocumentHeader, chrome: DocumentChrome): Blob {
  const [title, project, generated, author] = headerLines(header, chrome)
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const total = doc.getNumberOfPages()

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)
    doc.setFont(FAMILY, "bold").setFontSize(12)
    doc.text(title, MARGIN, MARGIN + 4)
    doc.setFont(FAMILY, "normal").setFontSize(8)
    doc.text(project, MARGIN, MARGIN + 17)
    doc.text(`${generated} · ${author}`, MARGIN, MARGIN + 28)
    doc.text(chrome.page(page, total), width - MARGIN, height - MARGIN, { align: "right" })
  }

  return doc.output("blob")
}
