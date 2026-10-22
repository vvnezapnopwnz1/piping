import { isSpoolgenFileRole, type SpoolgenFileRole } from "./spoolgen-file"

/** Where a weld is made, spelled the way the server stores it. */
export type WeldLocation = "shop" | "assembly" | "field"

/** How a PCF file becomes weld rows: data, not code, so a project can keep its own copy. */
export interface PcfTemplateSettings {
  kind: "pcf"
  /** The weld's SKEY → where it is made. */
  weldLocationBySkey: Record<string, WeldLocation>
  /** A raw weld type (WELD-TYPE, an end type, or the end of the part's SKEY) → the project's code; unmapped codes pass as they are. */
  weldTypeByCode: Record<string, string>
  /** PIPING-SPEC → the project's service class; unmapped specs pass as they are. */
  serviceClassBySpec: Record<string, string>
  /** The isometric number: the file name without extension, or the weld's PIPELINE-REFERENCE. */
  isoNumberFrom: "fileName" | "pipelineReference"
  /** The revision when the pipeline has no REVISION; null makes it a missing value. */
  defaultRevision: string | null
}

export const DEFAULT_PCF_SETTINGS: PcfTemplateSettings = {
  kind: "pcf",
  weldLocationBySkey: { WW: "shop", WS: "field", WF: "field", WO: "field" },
  weldTypeByCode: { WN: "BW" },
  serviceClassBySpec: {},
  isoNumberFrom: "fileName",
  defaultRevision: null,
}

/** The tiles of the import screen, in order: three PCF sources, an Excel workbook, and the four fixed SpoolGen files. */
export const IMPORT_SOURCE_IDS = ["aveva", "hexagon", "plant3d", "table", "spoolgen"] as const
export type ImportSourceId = (typeof IMPORT_SOURCE_IDS)[number]

export function isImportSourceId(value: string): value is ImportSourceId {
  return (IMPORT_SOURCE_IDS as readonly string[]).includes(value)
}

/** Which column of a file holds which contract field, per file role: contract key → the file's header. */
export interface TableTemplateSettings {
  kind: "table"
  columns: Partial<Record<SpoolgenFileRole, Record<string, string>>>
}

export type ImportTemplateSettings = PcfTemplateSettings | TableTemplateSettings

/** A template as the import screen uses it. `id` is null for a built-in preset, which has no row. */
export interface ImportTemplate {
  id: string | null
  source: ImportSourceId
  name: string
  settings: ImportTemplateSettings
}

/** The project's active codes a template or a drop-down can name. */
export interface ImportReferences {
  pdsAreas: string[]
  serviceClasses: string[]
  weldTypes: string[]
}

/** The kind of settings a source takes: the PCF sources read keywords, the others read columns. */
export function templateKindOf(source: ImportSourceId): ImportTemplateSettings["kind"] {
  return source === "aveva" || source === "hexagon" || source === "plant3d" ? "pcf" : "table"
}

const pcfPreset = (): PcfTemplateSettings => structuredClone(DEFAULT_PCF_SETTINGS)

/** Freezes a value and everything inside it. */
function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

/**
 * One per source, in the order of the tiles. Product names, not words, so they need no translation. The three
 * PCF presets share the defaults until a real file from a customer shows how the systems differ. Frozen all the
 * way down: a screen that edits a copy must get one from `parseTemplateSettings` or `structuredClone`, and
 * cannot change a preset for the rest of the session.
 */
export const BUILT_IN_TEMPLATES: readonly ImportTemplate[] = deepFreeze([
  { id: null, source: "aveva", name: "AVEVA E3D / PDMS", settings: pcfPreset() },
  { id: null, source: "hexagon", name: "Smart 3D / CADWorx", settings: pcfPreset() },
  { id: null, source: "plant3d", name: "Plant 3D", settings: pcfPreset() },
  { id: null, source: "table", name: "Excel", settings: { kind: "table", columns: {} } },
  { id: null, source: "spoolgen", name: "SpoolGen", settings: { kind: "table", columns: {} } },
] satisfies ImportTemplate[])

/**
 * The template an upload starts on: the first of the project's templates for the source, which come newest first, so
 * the mapping saved last is picked up at the next upload; the built-in preset when the project has none.
 */
export function pickInitialTemplate(source: ImportSourceId, projectTemplates: readonly ImportTemplate[]): ImportTemplate {
  return projectTemplates.find((template) => template.source === source) ?? BUILT_IN_TEMPLATES.find((template) => template.source === source)!
}

const WELD_LOCATIONS: readonly string[] = ["shop", "assembly", "field"]
const ISO_NUMBER_SOURCES: readonly string[] = ["fileName", "pipelineReference"]

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)

/** A map of strings to strings whose keys go through `key`, or null when it is not one. `fromEntries` keeps a key like __proto__ a plain key. */
function stringMap(value: unknown, key: (name: string) => string, allowed?: readonly string[]): Record<string, string> | null {
  if (!isRecord(value)) return null
  const entries = Object.entries(value)
  if (!entries.every(([, entry]) => typeof entry === "string" && (allowed === undefined || allowed.includes(entry)))) return null
  return Object.fromEntries(entries.map(([name, entry]) => [key(name), entry as string]))
}

const asIs = (name: string) => name
const upper = (name: string) => name.toUpperCase()

function parseTableSettings(value: Record<string, unknown>): TableTemplateSettings | null {
  if (value.columns === undefined) return { kind: "table", columns: {} }
  if (!isRecord(value.columns)) return null
  const columns: TableTemplateSettings["columns"] = {}
  for (const [role, headers] of Object.entries(value.columns)) {
    const map = stringMap(headers, asIs)
    if (map === null || !isSpoolgenFileRole(role)) return null
    columns[role] = map
  }
  return { kind: "table", columns }
}

function parsePcfSettings(value: Record<string, unknown>): PcfTemplateSettings | null {
  const defaults = pcfPreset()
  const weldLocationBySkey = value.weldLocationBySkey === undefined ? defaults.weldLocationBySkey : stringMap(value.weldLocationBySkey, upper, WELD_LOCATIONS)
  const weldTypeByCode = value.weldTypeByCode === undefined ? defaults.weldTypeByCode : stringMap(value.weldTypeByCode, upper)
  const serviceClassBySpec = value.serviceClassBySpec === undefined ? defaults.serviceClassBySpec : stringMap(value.serviceClassBySpec, asIs)
  const isoNumberFrom = value.isoNumberFrom === undefined ? defaults.isoNumberFrom : value.isoNumberFrom
  const defaultRevision = value.defaultRevision === undefined ? defaults.defaultRevision : value.defaultRevision
  if (weldLocationBySkey === null || weldTypeByCode === null || serviceClassBySpec === null) return null
  if (typeof isoNumberFrom !== "string" || !ISO_NUMBER_SOURCES.includes(isoNumberFrom)) return null
  if (defaultRevision !== null && typeof defaultRevision !== "string") return null
  return { kind: "pcf", weldLocationBySkey: weldLocationBySkey as PcfTemplateSettings["weldLocationBySkey"], weldTypeByCode, serviceClassBySpec, isoNumberFrom: isoNumberFrom as PcfTemplateSettings["isoNumberFrom"], defaultRevision }
}

/**
 * Settings read back from the database, or null when they are not a template. The shape is checked strictly
 * (every value a string, a role or a word the import knows); a PCF template fills what it omits from the
 * defaults. SKEY and weld-type keys are upper-cased because the weld derivation looks them up in upper case;
 * PIPING-SPEC keys stay as written.
 */
export function parseTemplateSettings(value: unknown): ImportTemplateSettings | null {
  if (!isRecord(value)) return null
  if (value.kind === "table") return parseTableSettings(value)
  if (value.kind === "pcf") return parsePcfSettings(value)
  return null
}

/** Why a template could not be saved, deleted or read. The screen turns the code into its words. */
export const IMPORT_TEMPLATE_ERROR_CODES = [
  "TEMPLATE_NAME_TAKEN", // a template with this name is already in the project
  "TEMPLATE_NAME_INVALID", // the name or the source fails the table's check
  "TEMPLATE_SETTINGS_INVALID", // the settings do not fit the template's source
  "TEMPLATE_REFUSED", // the project's rules did not let this user change it
  "TEMPLATE_SAVE_FAILED", // anything else
] as const
export type ImportTemplateErrorCode = (typeof IMPORT_TEMPLATE_ERROR_CODES)[number]

/**
 * A template error with a code. `detail` is the server's own sentence, kept only when the code does not say it all; the
 * screen shows it under the translated title. A code the client names itself carries none.
 */
export class ImportTemplateError extends Error {
  readonly code: ImportTemplateErrorCode
  readonly detail: string | undefined
  constructor(code: ImportTemplateErrorCode, detail?: string) {
    super(detail ?? code)
    this.code = code
    this.detail = detail
  }
}
