import type { Capability } from "@/modules/access/domain/capability"

export type DocumentCode = "RPT-W-001" | "RPT-N-001" | "RPT-P-001" | "RPT-T-002" | "DOS-T-001"
export type DocumentFormat = "xlsx" | "pdf"

export interface DocumentDefinition {
  code: DocumentCode
  scope: "project" | "testPack"
  formats: readonly DocumentFormat[]
  requiredCapability: Capability
  fileNameStem: string
}

/** One row of `weld_log_rows`: a weld of the current accepted revision. */
export interface WeldLogRow {
  weldJointRevisionId: string
  isometricId: string
  isoNumber: string
  revisionNumber: string
  lineNumber: string | null
  spoolNumber: string
  weldNumber: string
  weldLocation: string
  weldTypeCode: string | null
  diameterInch: number | null
  thicknessMm: number | null
  wpsCode: string | null
  welderCodes: string[]
  weldOn: string | null
  ndeMethods: string[]
  ndePending: number
  ndeRejected: number
  pwhtRequired: boolean
  pwhtAccepted: boolean
  traceNumbers: string[]
  testPackId: string | null
  testPackNumber: string | null
}

/** One row of `nde_register_rows`: an NDE obligation of a current weld, with its batch and result. */
export interface NdeRegisterRow {
  obligationId: string
  isometricId: string
  isoNumber: string
  spoolNumber: string
  weldNumber: string
  weldLocation: string
  welderCodes: string[]
  method: string
  selectionMode: string
  requiredCoverage: number
  disposition: string
  batchNumber: string | null
  batchStatus: string | null
  ndtSubcontractorName: string | null
  examinedOn: string | null
  outcome: string | null
  reportNumber: string | null
  defectCode: string | null
  testPackId: string | null
  testPackNumber: string | null
}

/** A category X punch item of a test pack. */
export interface PunchRow {
  id: string
  testPackNumber: string
  itemNumber: string
  isoNumber: string
  spoolNumber: string | null
  punchCode: string
  description: string
  checkingDate: string
  completionDate: string | null
}

/** One row of `test_pack_document_rows`. */
export interface TestPackDocumentRow {
  testPackId: string
  testPackNumber: string
  revisionNo: number
  lifecycle: string
  systemCode: string
  systemDescription: string
  subsystemCode: string
  subsystemDescription: string
  serviceClassCode: string
  lineServiceCode: string
  testMedium: string
  testPressure: number
  pressureUnit: string
  location: string
  plannedStartOn: string | null
  plannedEndOn: string | null
  isRft: boolean
  rftOn: string | null
  testingStartedOn: string | null
  testingCompletedOn: string | null
  precommissioningCompletedOn: string | null
  isoCount: number
  lineNumbers: string[]
  weldTotal: number
  weldDone: number
  openXCount: number
}

export const DOCUMENT_DEFINITIONS: readonly DocumentDefinition[] = [
  { code: "RPT-W-001", scope: "project", formats: ["xlsx"], requiredCapability: "reports.view", fileNameStem: "weld-log" },
  { code: "RPT-N-001", scope: "project", formats: ["xlsx"], requiredCapability: "reports.view", fileNameStem: "nde-register" },
  { code: "RPT-P-001", scope: "project", formats: ["xlsx"], requiredCapability: "reports.view", fileNameStem: "punch-register" },
  { code: "RPT-T-002", scope: "project", formats: ["xlsx"], requiredCapability: "reports.view", fileNameStem: "test-pack-summary" },
  { code: "DOS-T-001", scope: "testPack", formats: ["pdf", "xlsx"], requiredCapability: "reports.view", fileNameStem: "test-pack-dossier" },
]

function safeFilePart(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project"
}

export function buildReportFileName(
  definition: DocumentDefinition,
  projectCode: string,
  generatedAt: Date,
  format: DocumentFormat,
  subject?: string,
): string {
  const parts = [safeFilePart(projectCode), definition.fileNameStem, ...(subject ? [safeFilePart(subject)] : [])]
  return `${parts.join("-")}-${generatedAt.toISOString().slice(0, 10)}.${format}`
}

export function documentDefinition(code: string): DocumentDefinition | undefined {
  return DOCUMENT_DEFINITIONS.find((definition) => definition.code === code)
}
