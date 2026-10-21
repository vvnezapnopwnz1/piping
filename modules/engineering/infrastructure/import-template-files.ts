import type { SpoolgenFileRole } from "../domain/spoolgen-file"
import { templateFieldsFor, templateSampleRow } from "./import-template-data"

/** The header row the import matches by name and one example row: exactly what a role's sheet or file holds. */
export function templateRowsFor(role: SpoolgenFileRole): (string | number)[][] {
  return [templateFieldsFor(role).map((field) => field.header), templateSampleRow(role)]
}

/** A SpoolGen file: tab separated, a header row, one example row, a line break at the end. */
export function buildTemplateText(role: SpoolgenFileRole): string {
  return `${templateRowsFor(role).map((row) => row.join("\t")).join("\n")}\n`
}

/**
 * A CSV the reader takes as it is: UTF-8 with a byte order mark (Excel needs it to see UTF-8), ';' between cells as a
 * Russian Excel writes it, CRLF between rows. A cell holding ';', a quote or a line break is quoted, as Excel does.
 */
export function buildTemplateCsv(rows: readonly (readonly (string | number)[])[]): string {
  const cell = (value: string | number): string => {
    const text = String(value)
    return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return `\uFEFF${rows.map((row) => row.map(cell).join(";")).join("\r\n")}\r\n`
}
