import type { DocumentChrome, DocumentHeader, DocumentTable } from "../domain/document"
import {
  ndeRegisterTable,
  punchTable,
  testPackSummaryTable,
  weldLogTable,
  type RegisterLabels,
} from "../domain/registers"
import {
  buildReportFileName,
  documentDefinition,
  type DocumentFormat,
  type NdeRegisterRow,
  type PunchRow,
  type TestPackDocumentRow,
  type WeldLogRow,
} from "../domain/report"
import { documentSheet, xlsxBlob } from "../infrastructure/renderers/xlsx-document"

export interface DocumentRepository {
  loadWeldLog(projectId: string): Promise<WeldLogRow[]>
  loadNdeRegister(projectId: string): Promise<NdeRegisterRow[]>
  loadPunchRegister(projectId: string): Promise<PunchRow[]>
  loadTestPackSummary(projectId: string): Promise<TestPackDocumentRow[]>
}

export interface GenerateDocumentInput {
  code: string
  format: DocumentFormat
  projectId: string
  header: DocumentHeader
  chrome: DocumentChrome
  labels: RegisterLabels
}

export type GenerateDocumentResult =
  | { ok: true; value: { blob: Blob; fileName: string } }
  /** `detail` is the loader's own message, if it had one; the screen says what failed in the user's language. */
  | { ok: false; reason: "unknownReport" | "failed"; detail?: string }

async function registerTable(repository: DocumentRepository, input: GenerateDocumentInput): Promise<DocumentTable | null> {
  switch (input.code) {
    case "RPT-W-001": return weldLogTable(await repository.loadWeldLog(input.projectId), input.labels)
    case "RPT-N-001": return ndeRegisterTable(await repository.loadNdeRegister(input.projectId), input.labels)
    case "RPT-P-001": return punchTable(await repository.loadPunchRegister(input.projectId), input.labels)
    case "RPT-T-002": return testPackSummaryTable(await repository.loadTestPackSummary(input.projectId), input.labels)
    default: return null
  }
}

/** Builds one of the project registers as an XLSX file from the current project data. */
export async function generateDocument(
  repository: DocumentRepository,
  input: GenerateDocumentInput,
): Promise<GenerateDocumentResult> {
  const definition = documentDefinition(input.code)
  if (!definition || definition.scope !== "project" || !definition.formats.includes(input.format)) {
    return { ok: false, reason: "unknownReport" }
  }

  try {
    const table = await registerTable(repository, input)
    if (!table) return { ok: false, reason: "unknownReport" }
    const blob = xlsxBlob([{ name: input.header.title, sheet: documentSheet(input.header, input.chrome, table) }])
    return {
      ok: true,
      value: { blob, fileName: buildReportFileName(definition, input.header.projectCode, input.header.generatedAt, input.format) },
    }
  } catch (cause) {
    return {
      ok: false,
      reason: "failed",
      ...(cause instanceof Error && cause.message ? { detail: cause.message } : {}),
    }
  }
}
