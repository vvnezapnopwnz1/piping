import {
  REPORT_DEFINITIONS,
  buildReportFileName,
  type FabricationProgressSnapshot,
  type TestPackRftSnapshot,
} from "../domain/report"
import { renderFabricationProgress } from "../infrastructure/renderers/fabrication-progress"
import { renderTestPackRft } from "../infrastructure/renderers/test-pack-rft"

export interface ReportSnapshotRequest {
  projectId: string
  projectCode: string
  generatedAt: Date
}

export interface DemoReportRepository {
  loadFabricationProgress(request: ReportSnapshotRequest): Promise<FabricationProgressSnapshot>
  loadTestPackRft(request: ReportSnapshotRequest): Promise<TestPackRftSnapshot>
}

export interface GenerateDemoReportInput extends ReportSnapshotRequest {
  code: string
}

export type GenerateDemoReportResult =
  | { ok: true; value: { blob: Blob; fileName: string } }
  /** `detail` is the loader's own message, if it had one; the screen says what failed in the user's language. */
  | { ok: false; reason: "unknownReport" | "failed"; detail?: string }

export async function generateDemoReport(
  repository: DemoReportRepository,
  input: GenerateDemoReportInput,
): Promise<GenerateDemoReportResult> {
  const definition = REPORT_DEFINITIONS.find((candidate) => candidate.code === input.code)
  if (!definition) return { ok: false, reason: "unknownReport" }

  try {
    const request: ReportSnapshotRequest = {
      projectId: input.projectId,
      projectCode: input.projectCode,
      generatedAt: input.generatedAt,
    }
    const blob = definition.code === "RPT-F-001"
      ? renderFabricationProgress(await repository.loadFabricationProgress(request))
      : renderTestPackRft(await repository.loadTestPackRft(request))

    return {
      ok: true,
      value: {
        blob,
        fileName: buildReportFileName(definition, input.projectCode, input.generatedAt),
      },
    }
  } catch (cause) {
    return {
      ok: false,
      reason: "failed",
      ...(cause instanceof Error && cause.message ? { detail: cause.message } : {}),
    }
  }
}
