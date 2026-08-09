export const IMPORT_TYPES = [
  "piping_material_list",
  "welding_procedure",
  "welder_qualification",
  "thickness_flange",
  "nde_matrix",
  "flange_progress",
  "test_pack_composition",
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
  flange_progress: {
    importType: "flange_progress",
    label: "Flange progress",
    naturalKey: ["iso_number", "revision", "bt_number"],
    columns: [
      { key: "iso_number", header: "ISO Number", required: true, kind: "text" },
      { key: "revision", header: "Revision", required: true, kind: "text" },
      { key: "bt_number", header: "BT Number", required: true, kind: "text" },
      { key: "jointing_method", header: "Jointing Method", required: true, kind: "text" },
      { key: "jointing_value", header: "Jointing Value", required: true, kind: "number" },
      { key: "joint_category", header: "Joint Category", required: true, kind: "text" },
      { key: "reason", header: "Reason", required: true, kind: "text" },
      { key: "joint_date", header: "Joint Date", required: true, kind: "text" },
      { key: "report_number", header: "Report Number", required: true, kind: "text" },
      { key: "jointer_codes", header: "Jointer Codes", required: true, kind: "textList" },
      { key: "tag_number", header: "Tag Number", required: true, kind: "text" },
    ],
  },
  test_pack_composition: {
    importType: "test_pack_composition",
    label: "Test Pack composition",
    naturalKey: ["test_pack_number", "iso_number"],
    columns: [
      { key: "system", header: "System", required: true, kind: "text" },
      { key: "subsystem", header: "Subsystem", required: true, kind: "text" },
      { key: "test_pack_number", header: "Test Pack", required: true, kind: "text" },
      { key: "test_pack_revision", header: "Test Pack Rev", required: true, kind: "text" },
      { key: "test_medium", header: "Test Medium", required: true, kind: "text" },
      { key: "test_pressure", header: "Test Pressure", required: true, kind: "number" },
      { key: "planned_start_on", header: "Planned Start", required: true, kind: "text" },
      { key: "planned_end_on", header: "Planned End", required: true, kind: "text" },
      { key: "priority", header: "Priority", required: true, kind: "text" },
      { key: "service_class", header: "Service Class", required: true, kind: "text" },
      { key: "line_service", header: "Line Service", required: true, kind: "text" },
      { key: "volume_m3", header: "Volume m3", required: false, kind: "number" },
      { key: "test_pack_location", header: "Test Pack Location", required: true, kind: "text" },
      { key: "iso_number", header: "ISO Number", required: true, kind: "text" },
      { key: "iso_revision", header: "ISO Revision", required: true, kind: "text" },
      { key: "spool_number", header: "Spool Number", required: true, kind: "text" },
      { key: "spool_revision", header: "Spool Revision", required: true, kind: "text" },
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
