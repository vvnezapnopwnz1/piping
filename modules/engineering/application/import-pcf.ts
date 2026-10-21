import type { PcfTemplateSettings } from "../domain/import-template"
import { emptyFileSet } from "../domain/parsers/cross-file"
import { parsePcf } from "../domain/parsers/pcf"
import type { SpoolgenRecord } from "../domain/parsers/spoolgen-parser"
import { pcfToWeldRecords } from "../domain/pcf-welds"
import { spoolgenIssue, type SpoolgenIssue } from "../domain/spoolgen-issue"
import { buildSubmissionFromSet, type SpoolgenSubmission } from "./import-spooling"

export interface PcfSource { fileName: string; text: string }

/** Items in file name order, by code unit (the same in every browser locale); the list given is left as it is. */
export function inFileNameOrder<T>(items: readonly T[], fileNameOf: (item: T) => string): T[] {
  return [...items].sort((a, b) => { const left = fileNameOf(a); const right = fileNameOf(b); return left < right ? -1 : left > right ? 1 : 0 })
}
/**
 * One upload of PCF files, one isometric each. Files are read in name order (by code unit, the same in every browser
 * locale), so picking them in another order gives the same rows. A name given twice is an error and only its first
 * file is read. Nothing is sent without files or without a PDS area; blockers from reading are shown after validation.
 */
export function buildPcfSubmission(sources: readonly PcfSource[], context: { pdsArea: string; settings: PcfTemplateSettings }): SpoolgenSubmission {
  const sorted = inFileNameOrder(sources, (source) => source.fileName)
  const issues: SpoolgenIssue[] = context.pdsArea === "" ? [spoolgenIssue("MISSING_VALUE", null, "pds_area")] : []
  const weld: SpoolgenRecord[] = []; const read = new Set<string>(); const repeated = new Set<string>()
  for (const source of sorted) {
    if (read.has(source.fileName)) { repeated.add(source.fileName); continue }
    read.add(source.fileName); const result = pcfToWeldRecords(parsePcf(source.text), source.fileName, context); weld.push(...result.records); issues.push(...result.issues)
  }
  for (const fileName of repeated) issues.push(spoolgenIssue("DUPLICATE_FILE", null, null, { fileName }))
  return buildSubmissionFromSet({ ...emptyFileSet(), weld }, issues, sorted.length > 0 && context.pdsArea !== "" && repeated.size === 0)
}
