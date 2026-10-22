import type { StagingEntityKind } from "./entity"
import type { SpoolgenFileSet } from "./parsers/cross-file"
import type { SpoolgenRecord } from "./parsers/spoolgen-parser"
export interface StagingRow { rowNumber: number; rawValues: Record<string, string>; normalizedValues: Record<string, string>; action: "create" }
/** A staging row and the records it is built from: an isometric from every weld row of it, a spool from the weld rows of the spool, anything else from its own row. */
export interface StagingEntry { row: StagingRow; records: readonly SpoolgenRecord[] }
const value = (values: Record<string, string>, key: string) => values[key] ?? ""
function row(rowNumber: number, kind: StagingEntityKind, values: Record<string, string>, rawValues: Record<string, string>): StagingRow { return { rowNumber, rawValues, normalizedValues: { entity_type: kind, ...values }, action: "create" } }
export function buildStagingEntries(set: SpoolgenFileSet): StagingEntry[] {
  const entries: StagingEntry[] = []; let number = 0; const next = () => ++number
  const add = (built: StagingRow, records: readonly SpoolgenRecord[]) => { entries.push({ row: built, records }) }
  const isoOf = (record: SpoolgenRecord) => value(record.values, "iso_number"); const spoolOf = (record: SpoolgenRecord) => `${isoOf(record)}::${value(record.values, "spool_number")}`
  // Grouped once: a job holds thousands of welds, and a scan per isometric or spool would be quadratic.
  const group = (key: (record: SpoolgenRecord) => string) => { const groups = new Map<string, SpoolgenRecord[]>(); for (const record of set.weld) { const found = groups.get(key(record)); if (found) found.push(record); else groups.set(key(record), [record]) } return groups }
  const byIso = group(isoOf); const bySpool = group(spoolOf)
  const isoSeen = new Set<string>(); for (const record of set.weld) { const iso = isoOf(record); if (isoSeen.has(iso)) continue; isoSeen.add(iso); add(row(next(), "isometric", { iso_number: iso, revision_number: value(record.values, "revision_number"), pds_area: value(record.values, "pds_area"), service_class: value(record.values, "service_class"), line_number: value(record.values, "line_number"), sheet_number: value(record.values, "sheet_number") }, record.values), byIso.get(iso) ?? []) }
  const spoolSeen = new Set<string>(); let sequence = 0; for (const record of set.weld) { const key = spoolOf(record); if (spoolSeen.has(key)) continue; spoolSeen.add(key); sequence += 1; add(row(next(), "spool", { iso_number: value(record.values, "iso_number"), spool_number: value(record.values, "spool_number"), sequence_number: String(sequence), weight_kg: value(record.values, "spool_weight_kg"), material_class: value(record.values, "material_class") }, record.values), bySpool.get(key) ?? []) }
  for (const record of set.weld) add(row(next(), "weld_joint", { iso_number: value(record.values, "iso_number"), spool_number: value(record.values, "spool_number"), weld_number: value(record.values, "weld_number"), weld_type: value(record.values, "weld_type"), weld_location: value(record.values, "weld_location") || "shop", service_class: value(record.values, "service_class"), diameter_inch: value(record.values, "diameter_inch"), thickness_mm: value(record.values, "thickness_mm") }, record.values), [record])
  for (const record of set.supp) add(row(next(), "support", { iso_number: value(record.values, "iso_number"), spool_number: value(record.values, "spool_number"), support_number: value(record.values, "support_number"), support_type: value(record.values, "support_type"), quantity: value(record.values, "quantity") || "1" }, record.values), [record])
  for (const record of set.bolt) add(row(next(), "flange_joint", { iso_number: value(record.values, "iso_number"), spool_number: value(record.values, "spool_number"), flange_number: value(record.values, "flange_number"), flange_rating: value(record.values, "flange_rating"), diameter_inch: value(record.values, "diameter_inch"), bolt_size: value(record.values, "bolt_size"), bolt_quantity: value(record.values, "bolt_quantity"), joint_type: value(record.values, "joint_type") }, record.values), [record])
  for (const record of set.trace) add(row(next(), "material", { iso_number: value(record.values, "iso_number"), spool_number: value(record.values, "spool_number"), ident_code: value(record.values, "ident_code"), description: value(record.values, "description"), quantity: value(record.values, "quantity"), unit: value(record.values, "unit"), trace_number: value(record.values, "trace_number") }, record.values), [record])
  return entries
}
export function buildStagingRows(set: SpoolgenFileSet): StagingRow[] { return buildStagingEntries(set).map((entry) => entry.row) }
