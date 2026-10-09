import type { ImportIssueSeverity } from "./import-issue"

/**
 * An issue as the database and the SpoolGen import still hold it: a free `code` and a stored `message`.
 * The `modules/engineering`, `infrastructure` and `scripts` callers read this shape until their own
 * slices move to `ImportRowIssue`; nothing in `modules/imports/{domain,application,ui}` produces it.
 */
export interface StoredImportIssue {
  rowNumber: number | null
  columnName: string | null
  severity: ImportIssueSeverity
  code: string
  message: string
}
