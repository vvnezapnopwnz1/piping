export const IMPORT_TYPES = [
  "piping_material_list",
  "welding_procedure",
  "welder_qualification",
  "thickness_flange",
  "nde_matrix",
] as const

export type ImportType = (typeof IMPORT_TYPES)[number]

export type ImportColumnKind = "text" | "number" | "textList"

export interface ImportColumn {
  key: string
  header: string
  required: boolean
  kind: ImportColumnKind
}

export interface ImportTypeDefinition {
  importType: ImportType
  label: string
  columns: readonly ImportColumn[]
  naturalKey: readonly string[]
}

const DEFINITIONS: Record<ImportType, ImportTypeDefinition> = {
  piping_material_list: {
    importType: "piping_material_list",
    label: "Project Piping Material List",
    naturalKey: ["ident_code", "trace_number"],
    columns: [
      { key: "mrr_number", header: "MRR Number", required: true, kind: "text" },
      { key: "ident_code", header: "Ident Code", required: true, kind: "text" },
      { key: "trace_number", header: "Trace Number", required: true, kind: "text" },
    ],
  },
  welding_procedure: {
    importType: "welding_procedure",
    label: "Welding Procedure Specification",
    naturalKey: ["wps_code"],
    columns: [
      { key: "wps_code", header: "WPS Code", required: true, kind: "text" },
      { key: "subcontractor", header: "Subcontractor", required: true, kind: "text" },
      { key: "material_type", header: "Material Type", required: true, kind: "text" },
      { key: "diameter_from_inch", header: "Diameter From", required: true, kind: "number" },
      { key: "diameter_to_inch", header: "Diameter To", required: true, kind: "number" },
      { key: "thickness_from_mm", header: "Thickness From", required: true, kind: "number" },
      { key: "thickness_to_mm", header: "Thickness To", required: true, kind: "number" },
    ],
  },
  welder_qualification: {
    importType: "welder_qualification",
    label: "Welder Qualification",
    naturalKey: ["welder_code"],
    columns: [
      { key: "welder_code", header: "Welder Code", required: true, kind: "text" },
      { key: "welder_name", header: "Welder Name", required: true, kind: "text" },
      { key: "subcontractor", header: "Subcontractor", required: true, kind: "text" },
      { key: "wps_codes", header: "WPS Codes", required: true, kind: "textList" },
    ],
  },
  thickness_flange: {
    importType: "thickness_flange",
    label: "Weld Thickness and Flange Rating",
    naturalKey: ["service_class", "diameter_inch"],
    columns: [
      { key: "service_class", header: "Service Class", required: true, kind: "text" },
      { key: "diameter_inch", header: "Dia Inch", required: true, kind: "number" },
      { key: "thickness_mm", header: "Thickness", required: true, kind: "number" },
      { key: "flange_rating", header: "Flange Rating", required: true, kind: "text" },
    ],
  },
  nde_matrix: {
    importType: "nde_matrix",
    label: "NDE Matrix",
    naturalKey: ["service_class", "weld_type", "weld_location"],
    columns: [
      { key: "service_class", header: "Service Class", required: true, kind: "text" },
      { key: "weld_type", header: "Weld Type", required: true, kind: "text" },
      { key: "weld_location", header: "Weld Location", required: true, kind: "text" },
      { key: "rt_coverage", header: "RT %", required: false, kind: "number" },
      { key: "ut_coverage", header: "UT %", required: false, kind: "number" },
      { key: "mt_coverage", header: "MT %", required: false, kind: "number" },
      { key: "pt_coverage", header: "PT %", required: false, kind: "number" },
      { key: "pmi_coverage", header: "PMI %", required: false, kind: "number" },
      { key: "ht_coverage", header: "HT %", required: false, kind: "number" },
    ],
  },
}

export function getImportTypeDefinition(importType: ImportType): ImportTypeDefinition {
  const definition = DEFINITIONS[importType]
  if (!definition) throw new Error(`Unknown import type: ${importType}`)
  return definition
}

export function getImportJobTypeLabel(importType: string): string {
  if (importType === "spooling_definition") return "SpoolGen definition"
  if (importType in DEFINITIONS) return DEFINITIONS[importType as ImportType].label
  return `Unknown import type: ${importType}`
}

export function templateHeaderRow(importType: ImportType): string[] {
  return getImportTypeDefinition(importType).columns.map((column) => column.header)
}

export function requiredColumnKeys(importType: ImportType): string[] {
  return getImportTypeDefinition(importType)
    .columns.filter((column) => column.required)
    .map((column) => column.key)
}
