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
 * A weld number names one weld of its isometric, so a number repeated within one isometric names the same weld twice.
 * The check below keeps only one row per number, so what the later rows say would be lost without a word: a repeat that
 * says something else (another spool, size or place) is an error, and a repeat that says the same is only a warning.
 * Each later row is reported; the first one is the row that stays. The same number in two isometrics is not looked at
 * here: PCF files number their welds from 1 in every isometric.
 */
export function checkWeldDuplicates(weld: readonly SpoolgenRecord[]): SpoolgenIssue[] {
  const first = new Map<string, SpoolgenRecord>(); const issues: SpoolgenIssue[] = []
  for (const record of weld) {
    const number = (record.values.weld_number ?? "").trim()
    if (number === "") continue
    const key = `${record.values.iso_number ?? ""}::${number}`
    const kept = first.get(key)
    if (kept === undefined) { first.set(key, record); continue }
    const same = WELD_FACTS.every((name) => fact(kept.values[name]) === fact(record.values[name]))
    issues.push(spoolgenIssue(same ? "WELD_DUPLICATE_SAME" : "WELD_DUPLICATE", record.lineNumber, "weld_number", { fileName: record.fileName, role: record.role, severity: same ? "warning" : "blocker" }))
  }
  return issues
}
