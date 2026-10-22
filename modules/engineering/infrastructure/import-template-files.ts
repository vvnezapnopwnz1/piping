import type { SpoolgenFileRole } from "../domain/spoolgen-file"
import { templateFieldsFor, templateSampleRow } from "./import-template-data"

/** The header row the import matches by name and one example row: exactly what a role's sheet or file holds. */
export function templateRowsFor(role: SpoolgenFileRole): readonly (readonly (string | number)[])[] {
  return [templateFieldsFor(role).map((field) => field.header), templateSampleRow(role)]
}

/** A SpoolGen file: tab separated, a header row, one example row, a line break at the end. */
export function buildTemplateText(role: SpoolgenFileRole): string {
  return `${templateRowsFor(role).map((row) => row.join("\t")).join("\n")}\n`
}
