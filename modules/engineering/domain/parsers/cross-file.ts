import { spoolgenIssue, type SpoolgenIssue } from "../spoolgen-issue"
import type { SpoolgenFileRole } from "../spoolgen-file"
import type { SpoolgenRecord } from "./spoolgen-parser"

export type SpoolgenFileSet = Record<SpoolgenFileRole, readonly SpoolgenRecord[]>
export function emptyFileSet(): SpoolgenFileSet { return { weld: [], trace: [], bolt: [], supp: [] } }
const spoolKey = (record: SpoolgenRecord) => `${record.values.iso_number}::${record.values.spool_number}`
export function checkCrossFileConsistency(set: SpoolgenFileSet): SpoolgenIssue[] {
  const known = new Set(set.weld.map(spoolKey)); const issues: SpoolgenIssue[] = []
  for (const role of ["trace", "bolt", "supp"] as const) for (const record of set[role]) if (!known.has(spoolKey(record))) issues.push(spoolgenIssue("ORPHAN_SPOOL", record.lineNumber, "spool_number", { fileName: record.fileName, role: record.role }))
  return issues
}
export function checkIsoUniformity(weld: readonly SpoolgenRecord[]): SpoolgenIssue[] {
  const grouped = new Map<string, SpoolgenRecord[]>(); const issues: SpoolgenIssue[] = []
  for (const record of weld) { const group = grouped.get(record.values.iso_number); if (group) group.push(record); else grouped.set(record.values.iso_number, [record]) }
  for (const records of grouped.values()) for (const [key, code] of [["service_class", "ISO_MIXED_SERVICE_CLASS"], ["line_number", "ISO_MIXED_LINE"], ["revision_number", "ISO_MIXED_REVISION"]] as const) { const values = [...new Set(records.map((record) => record.values[key] ?? ""))]; if (values.length > 1) issues.push(spoolgenIssue(code, records[0].lineNumber, key, { fileName: records[0].fileName, role: records[0].role })) }
  return issues
}

/** What a weld row says about the weld; two rows with one weld number in one isometric agree when all of these agree. */
const WELD_FACTS = ["spool_number", "weld_type", "weld_location", "diameter_inch", "thickness_mm"] as const
const fact = (value: string | undefined) => { const text = (value ?? "").trim().toLowerCase(); return text !== "" && Number.isFinite(Number(text)) ? String(Number(text)) : text }
/**
 * A weld number names one weld of the project: the database keeps one weld for a number, so the same number in two
 * isometrics would be one weld with two revisions. Staging also keeps one row per number within an isometric, so what the
 * later rows say would be lost without a word. Every row after the first that uses a number is reported, the first one is
 * the row that stays:
 * - the number is already used in another isometric: an error (WELD_NUMBER_IN_OTHER_ISO);
 * - the same isometric says something else (another spool, size or place): an error (WELD_DUPLICATE);
 * - the same isometric says the same: a warning (WELD_DUPLICATE_SAME).
 * A PCF file numbers its welds from 1 in every isometric, so the PCF reader puts the isometric number in front of it.
 */
export function checkWeldDuplicates(weld: readonly SpoolgenRecord[]): SpoolgenIssue[] {
  const firstInIso = new Map<string, SpoolgenRecord>(); const firstOfNumber = new Map<string, SpoolgenRecord>(); const issues: SpoolgenIssue[] = []
  const report = (record: SpoolgenRecord, code: "WELD_DUPLICATE" | "WELD_DUPLICATE_SAME" | "WELD_NUMBER_IN_OTHER_ISO", severity: "blocker" | "warning") =>
    issues.push(spoolgenIssue(code, record.lineNumber, "weld_number", { fileName: record.fileName, role: record.role, severity }))
  for (const record of weld) {
    const number = (record.values.weld_number ?? "").trim()
    if (number === "") continue
    const key = `${record.values.iso_number ?? ""}::${number}`
    const kept = firstInIso.get(key)
    if (kept !== undefined) {
      const same = WELD_FACTS.every((name) => fact(kept.values[name]) === fact(record.values[name]))
      report(record, same ? "WELD_DUPLICATE_SAME" : "WELD_DUPLICATE", same ? "warning" : "blocker")
      continue
    }
    firstInIso.set(key, record)
    if (firstOfNumber.has(number)) report(record, "WELD_NUMBER_IN_OTHER_ISO", "blocker")
    else firstOfNumber.set(number, record)
  }
  return issues
}
