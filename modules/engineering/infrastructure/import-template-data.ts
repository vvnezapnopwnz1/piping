import { SPOOLGEN_CONTRACT } from "../domain/spoolgen-contract"
import type { SpoolgenFileRole } from "../domain/spoolgen-file"

/** The unit a person fills a column in, as a word the interface translates. */
export type TemplateUnit = "inch" | "mm" | "kg" | "count"
/** Where the value is found, so the help sheet can say it: in the file being filled, on the drawing, or in the project's codes. */
export type TemplateFieldSource = "file" | "drawing" | "projectCodes"
/** The only closed list in the contract: where a weld is made. */
export type TemplateAllowedValues = "weldLocation"

/** One column of a template: the header the import matches by name, and what the help sheet says about the cell. */
export interface TemplateField {
  key: string
  header: string
  required: boolean
  unit: TemplateUnit | null
  allowedValues: TemplateAllowedValues | null
  source: TemplateFieldSource
}

const UNITS: Readonly<Partial<Record<string, TemplateUnit>>> = { diameter_inch: "inch", thickness_mm: "mm", spool_weight_kg: "kg", bolt_quantity: "count" }
/** Per role, the unit of a column whose meaning differs between roles: a material's quantity is an amount, and its unit is the row's own UNIT column. */
const UNITS_BY_ROLE: Readonly<Partial<Record<SpoolgenFileRole, Readonly<Partial<Record<string, TemplateUnit>>>>>> = { supp: { quantity: "count" } }
const SOURCES: Readonly<Partial<Record<string, TemplateFieldSource>>> = { iso_number: "drawing", revision_number: "drawing", pds_area: "projectCodes", service_class: "projectCodes", weld_type: "projectCodes" }
const ALLOWED: Readonly<Partial<Record<string, TemplateAllowedValues>>> = { weld_location: "weldLocation" }

/**
 * The columns of one role, in contract order, with the canonical header: the download needs no column mapping because
 * the reader matches exactly these headers (`resolveColumns` falls back to the canonical name even when the project's
 * saved template maps other ones).
 */
export function templateFieldsFor(role: SpoolgenFileRole): TemplateField[] {
  return SPOOLGEN_CONTRACT[role].map((column) => ({
    key: column.key,
    header: column.canonicalHeader,
    required: column.required,
    unit: UNITS_BY_ROLE[role]?.[column.key] ?? UNITS[column.key] ?? null,
    allowedValues: ALLOWED[column.key] ?? null,
    source: SOURCES[column.key] ?? "file",
  }))
}

/**
 * One row of plausible values, the same for all four files: the isometric and spool names match, so the four SpoolGen
 * files and the four sheets of the workbook belong together when uploaded as downloaded. The values are tokens, not
 * sentences, except the description of a material, which is prose in a real register too.
 */
const SAMPLE_VALUES: Readonly<Record<string, string | number>> = {
  iso_number: "ISO-4001", revision_number: "R0", pds_area: "A-100", service_class: "CS150",
  line_number: "4-NG-4001-CS150", sheet_number: 1, spool_number: "ISO-4001-S1", spool_weight_kg: 125.5,
  material_class: "A1A", weld_number: "4001-S1-W01", weld_type: "BW", weld_location: "shop",
  diameter_inch: 4, thickness_mm: 6.02, ident_code: "PIPE100", description: "PIPE SEAMLESS, DN100, SCH 40",
  quantity: 1, unit: "M", trace_number: "H-2401", flange_number: "FL-4001-01", flange_rating: "CL150",
  bolt_size: "M16", bolt_quantity: 8, joint_type: "WN RF", support_number: "SUP-4001-01", support_type: "SHOE",
}

/** The example row of a role in the order of its columns; a column with no example stays empty. */
export function templateSampleRow(role: SpoolgenFileRole): (string | number)[] {
  return templateFieldsFor(role).map((field) => SAMPLE_VALUES[field.key] ?? "")
}
