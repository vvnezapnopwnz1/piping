import type { SpoolgenFileRole } from "./spoolgen-file"

export interface SpoolgenColumn { key: string; canonicalHeader: string; aliases: readonly string[]; required: boolean; numeric?: boolean }
export function normalizeHeader(header: string): string { return header.toUpperCase().replace(/[^A-Z0-9]/g, "") }
const iso: SpoolgenColumn = { key: "iso_number", canonicalHeader: "ISO_NUMBER", aliases: ["ISO", "ISONO", "ISONUMBER", "ISOMETRIC", "ISOMETRICNUMBER"], required: true }
const spool: SpoolgenColumn = { key: "spool_number", canonicalHeader: "SPOOL_NUMBER", aliases: ["SPOOL", "SPOOLNO", "SPOOLNUMBER", "SPOOLID"], required: true }
const text = (key: string, canonicalHeader: string, aliases: string[], required = false): SpoolgenColumn => ({ key, canonicalHeader, aliases, required })
const number = (key: string, canonicalHeader: string, aliases: string[], required = false): SpoolgenColumn => ({ key, canonicalHeader, aliases, required, numeric: true })

export const SPOOLGEN_CONTRACT: Record<SpoolgenFileRole, readonly SpoolgenColumn[]> = {
  weld: [iso, text("revision_number", "ISO_REVISION", ["REV", "REVISION", "ISOREV", "ISOREVISION"], true), text("pds_area", "PDS_AREA", ["PDS", "PDSAREA", "DESIGNAREA", "AREA"], true), text("service_class", "SERVICE_CLASS", ["SERVICECLASS", "SVCCLASS", "CLASS"], true), text("line_number", "LINE_NUMBER", ["LINE", "LINENO", "LINENUMBER", "PIPELINE", "PIPELINENUMBER"]), text("sheet_number", "SHEET_NUMBER", ["SHEET", "SHEETNO", "SHEETNUMBER"]), spool, number("spool_weight_kg", "SPOOL_WEIGHT_KG", ["WEIGHT", "WEIGHTKG", "SPOOLWEIGHT"]), text("material_class", "MATERIAL_CLASS", ["MATERIAL", "MATCLASS", "MATERIALCLASS"]), text("weld_number", "WELD_NUMBER", ["WELD", "WELDNO", "WELDNUMBER", "JOINT", "JOINTNO"], true), text("weld_type", "WELD_TYPE", ["WELDTYPE", "JOINTTYPE", "TYPE"], true), text("weld_location", "WELD_LOCATION", ["LOCATION", "WELDLOC", "SHOPFIELD"]), number("diameter_inch", "DIAMETER_INCH", ["DIA", "DIAMETER", "DIAINCH", "DIAMETERINCH", "NPS"], true), number("thickness_mm", "THICKNESS_MM", ["THK", "THICKNESS", "THKMM", "THICKNESSMM", "WALLTHICKNESS"], true)],
  trace: [iso, spool, text("ident_code", "IDENT_CODE", ["IDENT", "IDENTCODE", "ITEMCODE", "MATERIALCODE"], true), text("description", "DESCRIPTION", ["DESC", "ITEMDESCRIPTION"]), number("quantity", "QUANTITY", ["QTY", "QUANTITY"]), text("unit", "UNIT", ["UOM", "UNITOFMEASURE"]), text("trace_number", "TRACE_NUMBER", ["TRACE", "TRACENO", "TRACENUMBER", "HEATNUMBER"])],
  bolt: [iso, spool, text("flange_number", "FLANGE_NUMBER", ["FLANGE", "FLANGENO", "FLANGENUMBER", "BOLTEDJOINT"], true), text("flange_rating", "FLANGE_RATING", ["RATING", "FLANGERATING", "CLASSRATING"]), number("diameter_inch", "DIAMETER_INCH", ["DIA", "DIAMETER", "DIAINCH", "DIAMETERINCH", "NPS"]), text("bolt_size", "BOLT_SIZE", ["BOLT", "BOLTSIZE", "STUDSIZE"]), number("bolt_quantity", "BOLT_QUANTITY", ["BOLTQTY", "BOLTQUANTITY", "NOOFBOLTS"]), text("joint_type", "JOINT_TYPE", ["JOINTTYPE", "FLANGETYPE"])],
  supp: [iso, spool, text("support_number", "SUPPORT_NUMBER", ["SUPPORT", "SUPPNO", "SUPPORTNO", "SUPPORTNUMBER"], true), text("support_type", "SUPPORT_TYPE", ["SUPPORTTYPE", "SUPPTYPE"]), number("quantity", "QUANTITY", ["QTY", "NOOFF"])],
}
export interface ResolvedColumns { indexes: Map<string, number>; missingRequired: string[] }
export function resolveColumns(role: SpoolgenFileRole, headerRow: readonly string[]): ResolvedColumns {
  const headers = headerRow.map(normalizeHeader); const indexes = new Map<string, number>(); const missingRequired: string[] = []
  for (const column of SPOOLGEN_CONTRACT[role]) { const index = headers.findIndex((header) => [normalizeHeader(column.canonicalHeader), ...column.aliases.map(normalizeHeader)].includes(header)); if (index < 0) { if (column.required) missingRequired.push(column.key) } else indexes.set(column.key, index) }
  return { indexes, missingRequired }
}
export function requiredKeysFor(role: SpoolgenFileRole): string[] { return SPOOLGEN_CONTRACT[role].filter((column) => column.required).map((column) => column.key) }
export function numericKeysFor(role: SpoolgenFileRole): string[] { return SPOOLGEN_CONTRACT[role].filter((column) => column.numeric).map((column) => column.key) }
