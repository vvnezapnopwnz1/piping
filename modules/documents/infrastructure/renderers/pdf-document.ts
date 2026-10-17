import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"

import { headerLines, type Cell, type DocumentChrome, type DocumentHeader, type DocumentLocale, type DocumentTable } from "../../domain/document"

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
const numberFormats = new WeakMap<jsPDF, Intl.NumberFormat>()

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

export function createPdf(fonts: PdfFonts, orientation: "portrait" | "landscape", locale: DocumentLocale): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation, compress: false })
  doc.addFileToVFS("PTSans-Regular.ttf", base64(fonts.regular))
  doc.addFont("PTSans-Regular.ttf", FAMILY, "normal")
  doc.addFileToVFS("PTSans-Bold.ttf", base64(fonts.bold))
  doc.addFont("PTSans-Bold.ttf", FAMILY, "bold")
  doc.setFont(FAMILY, "normal")
  cursors.set(doc, contentTop())
  numberFormats.set(doc, new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-GB", { maximumFractionDigits: 3 }))
  return doc
}

/** Numbers as the reader writes them (6,02 in Russian); empty cells stay empty. */
function cellText(doc: jsPDF, cell: Cell): string {
  if (typeof cell === "number") return numberFormats.get(doc)?.format(cell) ?? String(cell)
  return cell ?? ""
}

function cursor(doc: jsPDF, room: number): number {
  const y = cursors.get(doc) ?? contentTop()
  if (y + room <= contentBottom(doc)) return y
  doc.addPage()
  return contentTop()
}

/** Starts the next part of the document on a fresh page. */
export function startPage(doc: jsPDF): void {
  doc.addPage()
  cursors.set(doc, contentTop())
}

/** A section title (when given) and its table; the table header repeats on every page it spans. */
export function drawSection(doc: jsPDF, title: string, table: DocumentTable, chrome: DocumentChrome): void {
  let y = cursor(doc, 60)
  if (title) {
    doc.setFont(FAMILY, "bold").setFontSize(11)
    doc.text(title, MARGIN, y)
    y += 8
  }
  doc.setFont(FAMILY, "normal").setFontSize(9)

  if (table.body.length === 0) {
    doc.text(chrome.noRecords, MARGIN, y + 8)
    cursors.set(doc, y + 8 + SECTION_GAP)
    return
  }

  const groupRow = table.groups?.map((group) => ({ content: group.label, colSpan: group.span, styles: { halign: "center" as const } }))
  autoTable(doc, {
    head: groupRow ? [groupRow, table.head] : [table.head],
    body: table.body.map((row) => row.map((cell) => cellText(doc, cell))),
    startY: y,
    margin: { top: contentTop(), bottom: MARGIN + FOOTER_HEIGHT, left: MARGIN, right: MARGIN },
    showHead: "everyPage",
    styles: {
      font: FAMILY, fontStyle: "normal", fontSize: table.head.length > 12 ? 6.5 : 8, cellPadding: table.head.length > 12 ? 2 : 3,
      overflow: "linebreak", textColor: 20,
      ...(table.rowHeight ? { minCellHeight: table.rowHeight, lineWidth: 0.4, lineColor: 160 } : {}),
    },
    headStyles: { font: FAMILY, fontStyle: "bold", fillColor: [235, 235, 235], textColor: 20, minCellHeight: 0 },
  })
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y
  cursors.set(doc, finalY + SECTION_GAP)
}

/** Label–value pairs as a two-column table without a header, labels in bold. */
export function drawFacts(doc: jsPDF, title: string, facts: Cell[][]): void {
  let y = cursor(doc, 40)
  if (title) {
    doc.setFont(FAMILY, "bold").setFontSize(11)
    doc.text(title, MARGIN, y)
    y += 8
  }
  autoTable(doc, {
    body: facts.map((row) => row.map((cell) => cellText(doc, cell))),
    startY: y,
    margin: { top: contentTop(), bottom: MARGIN + FOOTER_HEIGHT, left: MARGIN, right: MARGIN },
    theme: "plain",
    styles: { font: FAMILY, fontStyle: "normal", fontSize: 9, cellPadding: 2, textColor: 20 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 180 } },
  })
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y
  cursors.set(doc, finalY + SECTION_GAP)
}

/** A line or paragraph of running text: a form heading, a conclusion line or a footnote. */
export function drawParagraph(doc: jsPDF, text: string, style: "heading" | "body" | "note"): void {
  const size = style === "heading" ? 12 : style === "note" ? 7 : 9
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2
  doc.setFont(FAMILY, style === "heading" ? "bold" : "normal").setFontSize(size)
  const lines = doc.splitTextToSize(text, width) as string[]
  const y = cursor(doc, lines.length * size * 1.3 + 4)
  doc.text(lines, MARGIN, y)
  cursors.set(doc, y + lines.length * size * 1.3 + (style === "note" ? 4 : 10))
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
