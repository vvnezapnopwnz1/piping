import type { ImportReferences, PcfTemplateSettings } from "../domain/import-template"
import type { SpoolgenSubmission } from "./import-spooling"

/** The codes of an upload that are not among the project's active codes, sorted, each once. */
export interface UnmappedCodes { serviceClasses: string[]; weldTypes: string[] }
/** The project code a person chose for each code of the upload. */
export interface CodeChoices { serviceClasses: Record<string, string>; weldTypes: Record<string, string> }

const sortedUnique = (codes: Iterable<string>) => [...new Set(codes)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

/**
 * A suggestion for the person, not a readiness check: the service classes and weld types of the upload's welds that the
 * project has no active code for, offered for mapping. The rule belongs to the server, which refuses such a code with
 * SRV_SERVICE_CLASS_MISSING or SRV_WELD_TYPE_MISSING whatever this finds, so nothing is held back or let through here.
 * An empty value is a missing value the reader has already reported, not a code.
 */
export function suggestCodesToMap(submission: SpoolgenSubmission, references: ImportReferences): UnmappedCodes {
  const welds = submission.rows.map((row) => row.normalizedValues).filter((values) => values.entity_type === "weld_joint")
  const missing = (key: string, known: readonly string[]) => sortedUnique(welds.map((values) => values[key] ?? "").filter((code) => code !== "" && !known.includes(code)))
  return { serviceClasses: missing("service_class", references.serviceClasses), weldTypes: missing("weld_type", references.weldTypes) }
}

/**
 * A code the upload shows is either read from the file or produced by the template's own map (WN → BW). The choice
 * becomes a key of its own, and an entry that produced the code is pointed at the choice too, so every weld it covers
 * changes. Weld-type keys are upper-cased as a template read back has them; built with `fromEntries`, so a code
 * called __proto__ stays a key.
 */
function remap(map: Readonly<Record<string, string>>, choices: Readonly<Record<string, string>>, key: (code: string) => string): Record<string, string> {
  const chosen = (code: string) => (Object.hasOwn(choices, code) ? choices[code] : code)
  return Object.fromEntries([
    ...Object.entries(map).map(([from, to]) => [from, chosen(to)]),
    ...Object.entries(choices).map(([code, target]) => [key(code), target]),
  ])
}

/** The settings with the person's choices written into the code maps; the settings given are left as they were. */
export function applyCodeChoices(settings: PcfTemplateSettings, choices: CodeChoices): PcfTemplateSettings {
  return {
    ...structuredClone(settings),
    serviceClassBySpec: remap(settings.serviceClassBySpec, choices.serviceClasses, (code) => code),
    weldTypeByCode: remap(settings.weldTypeByCode, choices.weldTypes, (code) => code.toUpperCase()),
  }
}
