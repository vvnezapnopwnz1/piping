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
  for (const records of grouped.values()) for (const [key, code] of [["service_class", "ISO_MIXED_SERVICE_CLASS"], ["pds_area", "ISO_MIXED_PDS_AREA"], ["line_number", "ISO_MIXED_LINE"], ["revision_number", "ISO_MIXED_REVISION"]] as const) { const values = [...new Set(records.map((record) => record.values[key] ?? ""))]; if (values.length > 1) issues.push(spoolgenIssue(code, records[0].lineNumber, key, { fileName: records[0].fileName, role: records[0].role })) }
  return issues
}

/**
 * A number names one thing of the project, and the database keeps one thing per number (weld, spool, support, flange
 * joint). Staging keeps one row per number within an isometric, so what a repeated row says would be lost without a word.
 * Every row after the first that uses a number is reported; the first is the row that stays:
 * - the number is used in another isometric: an error (NUMBER_IN_OTHER_ISO), whatever else the row says;
 * - the same isometric says something else (another spool, size, place...): an error (NUMBER_DUPLICATE);
 * - the same isometric says the same: a warning (NUMBER_DUPLICATE_SAME).
 * The manual (19.2) calls a repeated flange joint an error against that joint; the same holds for the others. A PCF file
 * numbers its welds from 1 in every isometric, so the PCF reader puts the isometric number in front of the weld's.
 */
interface NumberRule { role: SpoolgenFileRole; key: string; facts: readonly string[] }
const NUMBER_RULES: readonly NumberRule[] = [
  { role: "weld", key: "weld_number", facts: ["spool_number", "weld_type", "weld_location", "diameter_inch", "thickness_mm"] },
  { role: "bolt", key: "flange_number", facts: ["spool_number", "flange_rating", "diameter_inch", "bolt_size", "bolt_quantity", "joint_type"] },
  { role: "supp", key: "support_number", facts: ["spool_number", "support_type", "quantity"] },
]
const fact = (value: string | undefined) => { const text = (value ?? "").trim().toLowerCase(); return text !== "" && Number.isFinite(Number(text)) ? String(Number(text)) : text }
export function checkNumberUniqueness(set: SpoolgenFileSet): SpoolgenIssue[] {
  const issues: SpoolgenIssue[] = []
  const report = (record: SpoolgenRecord, key: string, code: "NUMBER_DUPLICATE" | "NUMBER_DUPLICATE_SAME" | "NUMBER_IN_OTHER_ISO", severity: "blocker" | "warning") =>
    issues.push(spoolgenIssue(code, record.lineNumber, key, { fileName: record.fileName, role: record.role, severity }))
  for (const { role, key, facts } of NUMBER_RULES) {
    const firstInIso = new Map<string, SpoolgenRecord>(); const firstOfNumber = new Set<string>()
    for (const record of set[role]) {
      const number = (record.values[key] ?? "").trim()
      if (number === "") continue
      const isoKey = `${record.values.iso_number ?? ""}::${number}`; const kept = firstInIso.get(isoKey)
      if (kept !== undefined) {
        const same = facts.every((name) => fact(kept.values[name]) === fact(record.values[name]))
        report(record, key, same ? "NUMBER_DUPLICATE_SAME" : "NUMBER_DUPLICATE", same ? "warning" : "blocker")
        continue
      }
      firstInIso.set(isoKey, record)
      if (firstOfNumber.has(number)) report(record, key, "NUMBER_IN_OTHER_ISO", "blocker"); else firstOfNumber.add(number)
    }
  }
  // A spool is many weld rows, so a spool number repeats legitimately inside its isometric; only another isometric is an error.
  const isoOfSpool = new Map<string, string>()
  for (const record of set.weld) {
    const spool = (record.values.spool_number ?? "").trim(); const isoNumber = record.values.iso_number ?? ""
    if (spool === "") continue
    const known = isoOfSpool.get(spool)
    if (known === undefined) isoOfSpool.set(spool, isoNumber)
    else if (known !== isoNumber) report(record, "spool_number", "NUMBER_IN_OTHER_ISO", "blocker")
  }
  return issues
}
