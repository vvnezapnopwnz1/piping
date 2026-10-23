import type { ImportIssueSeverity } from "@/modules/imports/domain/import-issue"
import type { SpoolgenFileRole } from "./spoolgen-file"

/** Every code the SpoolGen validation reports. The UI has one sentence per code, in each language. */
export const SPOOLGEN_ISSUE_CODES = [
  "EMPTY_FILE",
  "MISSING_COLUMN",
  "MISSING_VALUE",
  "INVALID_NUMBER",
  "ORPHAN_SPOOL",
  "ISO_MIXED_SERVICE_CLASS",
  "ISO_MIXED_LINE",
  "ISO_MIXED_REVISION",
  "WELD_DUPLICATE",
  "WELD_DUPLICATE_SAME",
  "WELD_NUMBER_IN_OTHER_ISO",
  "FILE_EMPTY",
  "FILE_TOO_LARGE",
  "MISSING_REQUIRED_FILE",
  "PCF_UNKNOWN_UNITS",
  "PCF_NO_WELDS",
  "PCF_BORE_UNKNOWN",
  "PCF_SPOOL_FROM_FILE_NAME",
  "DUPLICATE_FILE",
] as const
export type SpoolgenIssueCode = (typeof SPOOLGEN_ISSUE_CODES)[number]

/** Codes about a whole file, not a row of it. */
export const FILE_CODES: ReadonlySet<string> = new Set(["EMPTY_FILE", "FILE_EMPTY", "FILE_TOO_LARGE", "MISSING_REQUIRED_FILE", "PCF_UNKNOWN_UNITS", "PCF_NO_WELDS", "PCF_SPOOL_FROM_FILE_NAME", "DUPLICATE_FILE"])

/** The codes the server's spooling check can store; the screen has one sentence per code, in each language. */
export const SPOOLING_SERVER_ISSUE_CODES = [
  "SRV_PDS_MISSING",
  "SRV_SERVICE_CLASS_MISSING",
  "SRV_WELD_TYPE_MISSING",
  "SRV_THICKNESS_MISSING",
  "SRV_NDE_MATRIX_MISSING",
  "SRV_WPS_MISSING",
  "SRV_ISO_MIXED_LINE",
  "SRV_ISO_MIXED_SERVICE_CLASS",
  "SRV_ORPHAN_SPOOL",
  "SRV_SPOOLING_SPINE_MISSING",
  "SRV_SPOOLING_JOB_TOO_LARGE",
] as const
export type SpoolingServerIssueCode = (typeof SPOOLING_SERVER_ISSUE_CODES)[number]

/**
 * Where the problem is and which code it is. It has the stored-issue shape (`code` + `message`) the
 * database and `scripts/` still read, but its text is the code: the sentence is chosen on screen, in
 * the user's language.
 */
export interface SpoolgenIssue {
  rowNumber: number | null
  columnName: string | null
  severity: ImportIssueSeverity
  code: SpoolgenIssueCode
  message: SpoolgenIssueCode
  /** The file the problem is in, when the import has more than one of a kind (PCF, tables). */
  fileName: string | null
  /** The file role of the record the issue points at: in one workbook a row number repeats on every sheet. */
  role?: SpoolgenFileRole
}

export function spoolgenIssue(
  code: SpoolgenIssueCode,
  rowNumber: number | null,
  columnName: string | null,
  options: { fileName?: string | null; severity?: ImportIssueSeverity; role?: SpoolgenFileRole } = {},
): SpoolgenIssue {
  return { rowNumber, columnName, severity: options.severity ?? "blocker", code, message: code, fileName: options.fileName ?? null, ...(options.role === undefined ? {} : { role: options.role }) }
}

export function isSpoolgenIssueCode(value: string): value is SpoolgenIssueCode {
  return (SPOOLGEN_ISSUE_CODES as readonly string[]).includes(value)
}

export function isSpoolingServerIssueCode(value: string): value is SpoolingServerIssueCode {
  return (SPOOLING_SERVER_ISSUE_CODES as readonly string[]).includes(value)
}
