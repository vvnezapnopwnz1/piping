import type { ImportIssueSeverity } from "@/modules/imports/domain/import-issue"

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
  "FILE_EMPTY",
  "FILE_TOO_LARGE",
  "MISSING_REQUIRED_FILE",
] as const
export type SpoolgenIssueCode = (typeof SPOOLGEN_ISSUE_CODES)[number]

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
}

export function spoolgenIssue(code: SpoolgenIssueCode, rowNumber: number | null, columnName: string | null): SpoolgenIssue {
  return { rowNumber, columnName, severity: "blocker", code, message: code }
}

export function isSpoolgenIssueCode(value: string): value is SpoolgenIssueCode {
  return (SPOOLGEN_ISSUE_CODES as readonly string[]).includes(value)
}
