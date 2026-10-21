import type { ImportRowIssue } from "../domain/import-issue"
import type { SpoolingTranslator } from "./spooling-translator"

/** The sentence for an issue. Headers, received values and key names are file data, passed through. */
export function describeImportIssue(t: SpoolingTranslator, issue: ImportRowIssue): string {
  switch (issue.code) {
    case "MISSING_COLUMN":
    case "REQUIRED":
      return t(`issues.${issue.code}`, { header: issue.header })
    case "NOT_A_NUMBER":
      return t("issues.NOT_A_NUMBER", { header: issue.header, received: issue.received })
    case "INVALID_RANGE":
      return t("issues.INVALID_RANGE", { range: issue.range })
    case "OUT_OF_RANGE":
      return t("issues.OUT_OF_RANGE", { bound: issue.bound })
    case "DUPLICATE_IN_FILE":
      return t("issues.DUPLICATE_IN_FILE", { keys: issue.keys.join(" + ") })
    case "INVALID_VALUE":
      return t("issues.INVALID_VALUE", { expected: issue.expected.join(", ") })
    default:
      return t(`issues.${issue.code}`)
  }
}

/**
 * Where an issue was found: `ISO-1001.pcf · Row 12 · spool_number`. An issue of a whole file names only
 * the file (`ISO-1002.pcf`); one with neither file nor row is about the whole set and reads "Sheet".
 */
export function describeIssueLocation(
  t: SpoolingTranslator,
  issue: { fileName?: string | null; rowNumber: number | null; columnName: string | null },
): string {
  const place = issue.rowNumber !== null
    ? t("issueList.row", { row: issue.rowNumber })
    : issue.fileName ? null : t("issueList.sheet")
  return [issue.fileName, place, issue.columnName].filter(Boolean).join(" · ")
}

/** The label of an import type; a type the app does not know is shown by its code. */
export function importTypeLabel(t: SpoolingTranslator, importType: string): string {
  const key = `importType.${importType}` as Parameters<SpoolingTranslator>[0]
  return importType !== "unknown" && t.has(key) ? t(key) : t("importType.unknown", { type: importType })
}
