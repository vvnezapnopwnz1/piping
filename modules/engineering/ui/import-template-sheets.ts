import type { Messages } from "@/i18n/messages"
import type { WorkbookSheet } from "@/modules/imports/infrastructure/xlsx-workbook"
import type { SpoolingTranslator } from "@/modules/imports/ui/spooling-translator"
import type { ImportReferences } from "../domain/import-template"
import { SPOOLGEN_FILE_ROLES, type SpoolgenFileRole } from "../domain/spoolgen-file"
import { templateFieldsFor } from "../infrastructure/import-template-data"
import { templateRowsFor } from "../infrastructure/import-template-files"

type FieldKey = keyof Messages["spooling"]["mapping"]["fields"]

/**
 * The tab a role's data sits in: the role itself, never translated, so an upload finds its sheet in either language.
 * `readSheetMatrix` compares it without case or padding.
 */
export function roleSheetName(role: SpoolgenFileRole): string { return role }

/**
 * The help sheet: for every role its columns, in contract order, with the label a person knows from the mapping screen,
 * the header to keep in the file, whether the cell is required, and what goes in it. The only place a note may live:
 * a note row inside a role's sheet would be read as a data row and block the upload.
 */
export function helpSheet(t: SpoolingTranslator): WorkbookSheet {
  const header = [
    t("templates.download.help.field"), t("templates.download.help.header"), t("templates.download.help.required"),
    t("templates.download.help.unit"), t("templates.download.help.allowed"), t("templates.download.help.source"),
  ]
  const rows: (string | number)[][] = []
  for (const role of SPOOLGEN_FILE_ROLES) {
    if (rows.length > 0) rows.push([""])
    rows.push([t(`table.role.${role}`)], header)
    for (const field of templateFieldsFor(role)) {
      rows.push([
        t(`mapping.fields.${field.key as FieldKey}`),
        field.header,
        field.required ? t("templates.download.required") : t("templates.download.optional"),
        field.unit === null ? "" : t(`templates.download.unit.${field.unit}`),
        field.allowedValues === null ? "" : t(`templates.download.allowed.${field.allowedValues}`),
        t(`templates.download.source.${field.source}`),
      ])
    }
  }
  rows.push([""], [t("templates.download.exampleRow")])
  return { name: t("templates.download.help.sheet"), rows }
}

/** The codes sheet: the project's active codes, one per row, so a person copies them instead of guessing. */
export function codesSheet(t: SpoolingTranslator, references: ImportReferences | null): WorkbookSheet {
  const rows: (string | number)[][] = [[t("templates.download.codes.group"), t("templates.download.codes.code")]]
  const groups = references === null ? [] : [
    { label: t("templates.download.codes.pdsArea"), codes: references.pdsAreas },
    { label: t("templates.download.codes.serviceClass"), codes: references.serviceClasses },
    { label: t("templates.download.codes.weldType"), codes: references.weldTypes },
  ]
  if (groups.every((group) => group.codes.length === 0)) rows.push([t("templates.download.codes.unavailable")])
  else for (const group of groups) for (const code of group.codes) rows.push([group.label, code])
  return { name: t("templates.download.codes.sheet"), rows }
}

/** The workbook the Excel tile hands out: a sheet per role, then the help and the project's codes. */
export function tableTemplateSheets(t: SpoolingTranslator, references: ImportReferences | null): WorkbookSheet[] {
  return [
    ...SPOOLGEN_FILE_ROLES.map((role) => ({ name: roleSheetName(role), rows: templateRowsFor(role) })),
    helpSheet(t),
    codesSheet(t, references),
  ]
}
