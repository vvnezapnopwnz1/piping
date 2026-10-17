import type { DocumentChrome, DocumentHeader } from "../domain/document"
import { buildReportFileName, documentDefinition, type DocumentFormat } from "../domain/report"
import type { DossierLabels, TestPackDossierSnapshot } from "../domain/test-pack-dossier"
import type { PdfFonts } from "../infrastructure/renderers/pdf-document"
import { renderTestPackDossierPdf, renderTestPackDossierXlsx } from "../infrastructure/renderers/test-pack-dossier"
import type { GenerateDocumentResult } from "./generate-document"

export interface DossierRepository {
  /** `null` when the pack does not exist or the reader may not see it. */
  loadTestPackDossier(projectId: string, testPackId: string): Promise<TestPackDossierSnapshot | null>
}

export interface GenerateDossierInput {
  format: DocumentFormat
  projectId: string
  testPackId: string
  header: DocumentHeader
  chrome: DocumentChrome
  labels: DossierLabels
  fonts: () => Promise<PdfFonts>
}

/** Builds the handover dossier of one test pack as a PDF to sign or an XLSX to edit. */
export async function generateTestPackDossier(
  repository: DossierRepository,
  input: GenerateDossierInput,
): Promise<GenerateDocumentResult> {
  const definition = documentDefinition("DOS-T-001")
  if (!definition || !definition.formats.includes(input.format)) return { ok: false, reason: "unknownReport" }

  try {
    const snapshot = await repository.loadTestPackDossier(input.projectId, input.testPackId)
    if (!snapshot) return { ok: false, reason: "failed" }
    const blob = input.format === "pdf"
      ? renderTestPackDossierPdf(snapshot, await input.fonts(), input.header, input.chrome, input.labels)
      : renderTestPackDossierXlsx(snapshot, input.header, input.chrome, input.labels)
    const fileName = buildReportFileName(
      definition, input.header.projectCode, input.header.generatedAt, input.format, snapshot.pack.testPackNumber,
    )
    return { ok: true, value: { blob, fileName } }
  } catch (cause) {
    return {
      ok: false,
      reason: "failed",
      ...(cause instanceof Error && cause.message ? { detail: cause.message } : {}),
    }
  }
}
