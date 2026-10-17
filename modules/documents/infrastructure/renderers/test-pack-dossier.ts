import type { DocumentChrome, DocumentHeader } from "../../domain/document"
import { ndeRegisterTable, punchTable } from "../../domain/registers"
import {
  actFacts,
  actTable,
  conclusionLine,
  isoTable,
  packFacts,
  signatureTable,
  weldHistoryTable,
  type DossierLabels,
  type TestPackDossierSnapshot,
} from "../../domain/test-pack-dossier"
import { createPdf, drawFacts, drawParagraph, drawSection, finishPdf, startPage, type PdfFonts } from "./pdf-document"
import { documentSheet, xlsxBlob } from "./xlsx-document"

/**
 * The handover dossier of one test pack: the pack and its composition, the pressure test act blank on a page of
 * its own, then the weld history, NDE and punch items. Landscape A4, every word through PT Sans.
 */
export function renderTestPackDossierPdf(
  snapshot: TestPackDossierSnapshot,
  fonts: PdfFonts,
  header: DocumentHeader,
  chrome: DocumentChrome,
  labels: DossierLabels,
): Blob {
  const doc = createPdf(fonts, "landscape", header.locale)

  drawFacts(doc, labels.sections.pack, packFacts(snapshot, labels))
  drawSection(doc, labels.sections.isos, isoTable(snapshot, labels), chrome)

  startPage(doc)
  drawParagraph(doc, labels.sections.act, "heading")
  drawFacts(doc, "", actFacts(snapshot, labels))
  drawSection(doc, "", actTable(snapshot, labels), chrome)
  drawParagraph(doc, conclusionLine(labels), "body")
  drawSection(doc, "", signatureTable(labels), chrome)
  drawParagraph(doc, labels.act.footnote, "note")

  startPage(doc)
  drawSection(doc, labels.sections.weldHistory, weldHistoryTable(snapshot, labels), chrome)
  drawSection(doc, labels.sections.nde, ndeRegisterTable(snapshot.nde, labels), chrome)
  drawSection(doc, labels.sections.punch, punchTable(snapshot.punch, labels), chrome)

  return finishPdf(doc, header, chrome)
}

/** The same dossier as workbook sheets for editing. The act is left out: it is signed on paper. */
export function renderTestPackDossierXlsx(
  snapshot: TestPackDossierSnapshot,
  header: DocumentHeader,
  chrome: DocumentChrome,
  labels: DossierLabels,
): Blob {
  return xlsxBlob([
    { name: labels.sections.pack, sheet: documentSheet(header, chrome, { head: [labels.sections.pack, ""], body: packFacts(snapshot, labels) }) },
    { name: labels.sections.isos, sheet: documentSheet(header, chrome, isoTable(snapshot, labels)) },
    { name: labels.sections.weldHistory, sheet: documentSheet(header, chrome, weldHistoryTable(snapshot, labels)) },
    { name: labels.sections.nde, sheet: documentSheet(header, chrome, ndeRegisterTable(snapshot.nde, labels)) },
    { name: labels.sections.punch, sheet: documentSheet(header, chrome, punchTable(snapshot.punch, labels)) },
  ])
}
