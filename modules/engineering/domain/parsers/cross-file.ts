import { spoolgenIssue, type SpoolgenIssue } from "../spoolgen-issue"
import type { SpoolgenFileRole } from "../spoolgen-file"
import type { SpoolgenRecord } from "./spoolgen-parser"

export type SpoolgenFileSet = Record<SpoolgenFileRole, readonly SpoolgenRecord[]>
export function emptyFileSet(): SpoolgenFileSet { return { weld: [], trace: [], bolt: [], supp: [] } }
const spoolKey = (record: SpoolgenRecord) => `${record.values.iso_number}::${record.values.spool_number}`
export function checkCrossFileConsistency(set: SpoolgenFileSet): SpoolgenIssue[] {
  const known = new Set(set.weld.map(spoolKey)); const issues: SpoolgenIssue[] = []
  for (const role of ["trace", "bolt", "supp"] as const) for (const record of set[role]) if (!known.has(spoolKey(record))) issues.push(spoolgenIssue("ORPHAN_SPOOL", record.lineNumber, "spool_number", { fileName: record.fileName }))
  return issues
}
export function checkIsoUniformity(weld: readonly SpoolgenRecord[]): SpoolgenIssue[] {
  const grouped = new Map<string, SpoolgenRecord[]>(); const issues: SpoolgenIssue[] = []
  for (const record of weld) { const group = grouped.get(record.values.iso_number); if (group) group.push(record); else grouped.set(record.values.iso_number, [record]) }
  for (const records of grouped.values()) for (const [key, code] of [["service_class", "ISO_MIXED_SERVICE_CLASS"], ["line_number", "ISO_MIXED_LINE"], ["revision_number", "ISO_MIXED_REVISION"]] as const) { const values = [...new Set(records.map((record) => record.values[key] ?? ""))]; if (values.length > 1) issues.push(spoolgenIssue(code, records[0].lineNumber, key, { fileName: records[0].fileName })) }
  return issues
}
