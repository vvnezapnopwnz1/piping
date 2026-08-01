import type { ImportIssue } from "@/modules/imports/domain/import-issue"
import type { SpoolgenFileRole } from "../spoolgen-file"
import type { SpoolgenRecord } from "./spoolgen-parser"

export type SpoolgenFileSet = Record<SpoolgenFileRole, readonly SpoolgenRecord[]>
export function emptyFileSet(): SpoolgenFileSet { return { weld: [], trace: [], bolt: [], supp: [] } }
const spoolKey = (record: SpoolgenRecord) => `${record.values.iso_number}::${record.values.spool_number}`
export function checkCrossFileConsistency(set: SpoolgenFileSet): ImportIssue[] {
  const known = new Set(set.weld.map(spoolKey)); const issues: ImportIssue[] = []
  for (const role of ["trace", "bolt", "supp"] as const) for (const record of set[role]) if (!known.has(spoolKey(record))) issues.push({ rowNumber: record.lineNumber, columnName: "spool_number", severity: "blocker", code: "ORPHAN_SPOOL", message: `${role}.txt row ${record.lineNumber}: spool "${record.values.spool_number}" of isometric "${record.values.iso_number}" is not present in weld.txt.` })
  return issues
}
export function checkIsoUniformity(weld: readonly SpoolgenRecord[]): ImportIssue[] {
  const grouped = new Map<string, SpoolgenRecord[]>(); const issues: ImportIssue[] = []
  for (const record of weld) { const group = grouped.get(record.values.iso_number); if (group) group.push(record); else grouped.set(record.values.iso_number, [record]) }
  for (const [iso, records] of grouped) for (const [key, code, label] of [["service_class", "ISO_MIXED_SERVICE_CLASS", "service class"], ["line_number", "ISO_MIXED_LINE", "line number"], ["revision_number", "ISO_MIXED_REVISION", "revision number"]] as const) { const values = [...new Set(records.map((record) => record.values[key] ?? ""))]; if (values.length > 1) issues.push({ rowNumber: records[0].lineNumber, columnName: key, severity: "blocker", code, message: `Isometric "${iso}" carries more than one ${label}: ${values.join(", ")}.` }) }
  return issues
}
