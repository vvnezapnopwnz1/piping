import definitionData from "./import-types.json"

export const IMPORT_TYPES = [
  "piping_material_list",
  "welding_procedure",
  "welder_qualification",
  "thickness_flange",
  "nde_matrix",
  "flange_progress",
  "test_pack_composition",
  "tracking_scan",
] as const

export type ImportType = (typeof IMPORT_TYPES)[number]

export function parseImportType(raw: string | null): ImportType | null {
  return raw && (IMPORT_TYPES as readonly string[]).includes(raw) ? (raw as ImportType) : null
}

export type ImportColumnKind = "text" | "number" | "textList"

export interface ImportColumn {
  key: string
  header: string
  required: boolean
  kind: ImportColumnKind
}

export interface ImportTypeDefinition {
  importType: ImportType
  columns: readonly ImportColumn[]
  naturalKey: readonly string[]
}

/** The spreadsheet format per type: column headers are the file contract, so they are data. */
const DEFINITIONS = Object.fromEntries(
  Object.entries(definitionData).map(([importType, definition]) => [importType, { importType, ...definition }])
) as unknown as Record<ImportType, ImportTypeDefinition>

export function getImportTypeDefinition(importType: ImportType): ImportTypeDefinition {
  const definition = DEFINITIONS[importType]
  if (!definition) throw new Error(`Unknown import type: ${importType}`)
  return definition
}

export function templateHeaderRow(importType: ImportType): string[] {
  return getImportTypeDefinition(importType).columns.map((column) => column.header)
}

export function requiredColumnKeys(importType: ImportType): string[] {
  return getImportTypeDefinition(importType)
    .columns.filter((column) => column.required)
    .map((column) => column.key)
}
