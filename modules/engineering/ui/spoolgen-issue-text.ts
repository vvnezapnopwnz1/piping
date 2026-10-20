import type { SpoolingTranslator } from "@/modules/imports/ui/spooling-translator"
import { SPOOLGEN_MAX_FILE_BYTES } from "../domain/spoolgen-file"
import { isSpoolgenIssueCode } from "../domain/spoolgen-issue"

/** Codes about a whole file. The sentence names the issue's file, else `<role>.txt` for the four SpoolGen files. */
const FILE_CODES = new Set(["EMPTY_FILE", "FILE_EMPTY", "FILE_TOO_LARGE", "MISSING_REQUIRED_FILE", "PCF_UNKNOWN_UNITS", "PCF_NO_WELDS", "PCF_SPOOL_FROM_FILE_NAME", "DUPLICATE_FILE"])

export interface StoredSpoolgenIssueText {
  code: string
  columnName: string | null
  message: string
  fileName?: string | null
}

/**
 * The sentence for an issue. A code the app does not know comes from the server and keeps its own
 * sentence; a stored message that is only the code is shown as the code.
 */
export function describeSpoolgenIssue(t: SpoolingTranslator, issue: StoredSpoolgenIssueText): string {
  if (!isSpoolgenIssueCode(issue.code)) return issue.message
  const column = issue.columnName ?? ""
  return t(`spoolgenIssues.${issue.code}`, FILE_CODES.has(issue.code)
    ? { file: issue.fileName ?? `${column}.txt`, limit: SPOOLGEN_MAX_FILE_BYTES / (1024 * 1024) }
    : { column })
}
