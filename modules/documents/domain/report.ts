import type { Capability } from "@/modules/access/domain/capability"

export type ReportCode = "RPT-F-001" | "RPT-T-001"

export interface ReportDefinition {
  code: ReportCode
  title: string
  description: string
  outputFormat: "xlsx" | "pdf"
  requiredCapability: Capability
  fileNameStem: string
}

export interface FabricationProgressRow {
  spoolNumber: string
  weldNumber: string
  weldLocation: string
  wpsCode: string
  welders: readonly string[]
  weldedOn: string | null
  ndePending: number
  ndeTotal: number
}

export interface FabricationProgressSnapshot {
  projectCode: string
  generatedAt: Date
  rows: readonly FabricationProgressRow[]
}

export interface TestPackRftRow {
  testPackNumber: string
  lifecycle: string
  isRft: boolean
  rftOn: string | null
  memberCount: number
  spoolTotal: number
  weldOrSupportPendingCount: number
  ndePendingCount: number
  pwhtPendingCount: number
  flangePendingCount: number
  lineCheckPendingCount: number
  xOpenCount: number
}

export interface TestPackRftSnapshot {
  projectCode: string
  generatedAt: Date
  rows: readonly TestPackRftRow[]
}

export type ReportSnapshot = FabricationProgressSnapshot | TestPackRftSnapshot

export const REPORT_DEFINITIONS: readonly ReportDefinition[] = [
  {
    code: "RPT-F-001",
    title: "Fabrication Progress",
    description: "Project snapshot of completed weld progress and NDE workload.",
    outputFormat: "xlsx",
    requiredCapability: "reports.view",
    fileNameStem: "fabrication-progress",
  },
  {
    code: "RPT-T-001",
    title: "Test Pack RFT Pursuit",
    description: "Project snapshot of Test Pack readiness and outstanding blockers.",
    outputFormat: "pdf",
    requiredCapability: "reports.view",
    fileNameStem: "test-pack-rft-pursuit",
  },
] as const

function safeFilePart(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project"
}

function datePart(generatedAt: Date): string {
  return generatedAt.toISOString().slice(0, 10)
}

export function buildReportFileName(
  definition: ReportDefinition,
  projectCode: string,
  generatedAt: Date,
): string {
  return `${safeFilePart(projectCode)}-${definition.fileNameStem}-${datePart(generatedAt)}.${definition.outputFormat}`
}

export function reportDefinition(code: ReportCode): ReportDefinition {
  const definition = REPORT_DEFINITIONS.find((candidate) => candidate.code === code)
  if (!definition) throw new Error(`Unknown report: ${code}`)
  return definition
}
