import type { PcfTemplateSettings, WeldLocation } from "./import-template"
import { attribute, endPoints, type PcfBlock, type PcfBoreUnit, type PcfFile, type PcfPoint } from "./parsers/pcf"
import type { SpoolgenRecord } from "./parsers/spoolgen-parser"
import { requiredKeysFor } from "./spoolgen-contract"
import { spoolgenIssue, type SpoolgenIssue, type SpoolgenIssueCode } from "./spoolgen-issue"

// DN in millimetres → nominal size in inches by table, so DN 100 is exactly 4 (100 / 25.4 would miss the thickness rule and the WPS range).
const DN_TO_INCH = new Map([[6, 0.125], [8, 0.25], [10, 0.375], [15, 0.5], [20, 0.75], [25, 1], [32, 1.25], [40, 1.5], [50, 2], [65, 2.5], [80, 3], [90, 3.5], [100, 4], [125, 5], [150, 6], [200, 8], [250, 10], [300, 12], [350, 14], [400, 16], [450, 18], [500, 20], [550, 22], [600, 24], [650, 26], [700, 28], [750, 30], [800, 32], [850, 34], [900, 36], [1000, 40], [1050, 42], [1200, 48]])
export function boreToInch(value: number, unit: PcfBoreUnit): number | null {
  if (unit === "MM") return DN_TO_INCH.get(value) ?? null
  return unit === "INCH-SIXTEENTH" ? value / 16 : value
}

const LOCATION_BY_CATEGORY: Record<string, WeldLocation> = { FABRICATION: "shop", ERECTION: "field" }
// The PDS area is chosen on screen once for the whole upload, so it is checked there, not on every weld. A PCF weld must say where it is made: an empty location would be stored as shop.
const CHECKED_KEYS = [...requiredKeysFor("weld").filter((key) => key !== "pds_area"), "weld_location"]
// An empty attribute counts as absent. A template map is read by its own keys only, so a spec named "constructor" stays a spec.
const read = (block: PcfBlock | null, keyword: string): string | null => (block === null ? null : attribute(block, keyword) || null)
const code = (block: PcfBlock | null, keyword: string): string | null => read(block, keyword)?.toUpperCase() ?? null
const mapped = <T extends string>(map: Record<string, T>, key: string | null): T | null => (key !== null && Object.hasOwn(map, key) ? map[key] : null)
const sameSpot = (a: PcfPoint, b: PcfPoint) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01 && Math.abs(a.z - b.z) < 0.01
const withoutExtension = (fileName: string) => fileName.replace(/\.[^.]*$/, "")

/**
 * One SpoolGen weld record per WELD block, in file order. The weld's part is its master component, else the nearest part
 * before it, else after it, all within the weld's pipeline (a part is a non-WELD block with an END-POINT, so a
 * MESSAGE-SQUARE or SUPPORT is skipped). A spool is looked for the same way; a file with none takes its own name.
 * Implied welds (two components with no WELD between them) are not read in this version. Values the file does not give
 * are missing values at the weld's line; a weld without REPEAT-WELD-IDENTIFIER gives no record, its number is never invented.
 * REPEAT-WELD-IDENTIFIER numbers the welds of one isometric (every file starts from 1), while a weld number is one weld of the
 * whole project, so the number of the record is the isometric number and the identifier: `ISO-A-1`.
 */
export function pcfToWeldRecords(file: PcfFile, fileName: string, context: { pdsArea: string; settings: PcfTemplateSettings }): { records: SpoolgenRecord[]; issues: SpoolgenIssue[] } {
  const { settings } = context
  const issue = (issueCode: SpoolgenIssueCode, row: number | null, column: string | null, severity: "blocker" | "warning" = "blocker") => spoolgenIssue(issueCode, row, column, { fileName, severity, role: "weld" })
  if (file.boreUnit === null) return { records: [], issues: [issue("PCF_UNKNOWN_UNITS", null, null)] }
  const unit = file.boreUnit; const blocks = file.components; const points = blocks.map(endPoints)
  if (!blocks.some((block) => block.keyword === "WELD")) return { records: [], issues: [issue("PCF_NO_WELDS", null, null)] }
  const isPart = (index: number) => blocks[index].keyword !== "WELD" && points[index].length > 0
  const hasSpool = (index: number) => read(blocks[index], "SPOOL-IDENTIFIER") !== null
  // A weld looks only inside its own pipeline: from its PIPELINE-REFERENCE up to the next one. Component identifiers may restart there.
  const section = blocks.map((block) => file.pipelines.filter((pipeline) => pipeline.line < block.line).length)
  const nearest = (from: number, test: (index: number) => boolean): number | null => {
    for (let index = from - 1; index >= 0 && section[index] === section[from]; index -= 1) if (test(index)) return index
    for (let index = from + 1; index < blocks.length && section[index] === section[from]; index += 1) if (test(index)) return index
    return null
  }
  const blockAt = (index: number | null) => (index === null ? null : blocks[index])
  const partKey = (index: number, id: string) => `${section[index]}|${id}`; const partById = new Map<string, number>()
  blocks.forEach((block, index) => { const id = read(block, "COMPONENT-IDENTIFIER"); if (id !== null && block.keyword !== "WELD" && !partById.has(partKey(index, id))) partById.set(partKey(index, id), index) })
  const spoolInFile = blocks.some((_, index) => hasSpool(index))
  const records: SpoolgenRecord[] = []; const issues: SpoolgenIssue[] = spoolInFile ? [] : [issue("PCF_SPOOL_FROM_FILE_NAME", null, "spool_number", "warning")]
  blocks.forEach((weld, at) => {
    if (weld.keyword !== "WELD") return
    const pipeline = file.pipelines[section[at] - 1] ?? null; const master = read(weld, "MASTER-COMPONENT-IDENTIFIER")
    const partAt = (master === null ? undefined : partById.get(partKey(at, master))) ?? nearest(at, isPart); const part = blockAt(partAt); const partPoints = partAt === null ? [] : points[partAt]
    const weldPoint = points[at][0] ?? null; const partEnd = weldPoint === null ? null : partPoints.find((point) => sameSpot(point, weldPoint)) ?? null
    const rawType = code(weld, "WELD-TYPE") ?? partEnd?.endType ?? code(part, "SKEY")?.slice(-2) ?? null
    const spec = read(weld, "PIPING-SPEC") ?? read(part, "PIPING-SPEC") ?? read(pipeline, "PIPING-SPEC")
    const spool = spoolInFile ? read(weld, "SPOOL-IDENTIFIER") ?? read(part, "SPOOL-IDENTIFIER") ?? read(blockAt(nearest(at, hasSpool)), "SPOOL-IDENTIFIER") ?? "" : withoutExtension(fileName)
    // With no bore on the weld, the part's end at the weld gives it; a part whose ends differ (a reducer) gives none rather than its first end.
    const partBores = new Set(partPoints.map((point) => point.bore)); const bore = weldPoint?.bore ?? partEnd?.bore ?? (partBores.size === 1 ? [...partBores][0] : null); const inch = bore === null ? null : boreToInch(bore, unit)
    const isoNumber = settings.isoNumberFrom === "pipelineReference" ? pipeline?.value ?? "" : withoutExtension(fileName)
    const identifier = read(weld, "REPEAT-WELD-IDENTIFIER")
    const values: Record<string, string> = {
      iso_number: isoNumber,
      revision_number: read(pipeline, "REVISION") ?? settings.defaultRevision ?? "", pds_area: context.pdsArea,
      service_class: spec === null ? "" : mapped(settings.serviceClassBySpec, spec) ?? spec, line_number: pipeline?.value ?? "", sheet_number: "",
      spool_number: spool, spool_weight_kg: "", material_class: "", weld_number: identifier === null ? "" : isoNumber === "" ? identifier : `${isoNumber}-${identifier}`,
      weld_type: rawType === null ? "" : mapped(settings.weldTypeByCode, rawType) ?? rawType,
      weld_location: mapped(settings.weldLocationBySkey, code(weld, "SKEY")) ?? mapped(LOCATION_BY_CATEGORY, code(weld, "CATEGORY")) ?? "",
      diameter_inch: inch === null ? "" : String(inch), thickness_mm: "",
    }
    for (const key of CHECKED_KEYS) if (values[key] === "") issues.push(issue(key === "diameter_inch" && bore !== null ? "PCF_BORE_UNKNOWN" : "MISSING_VALUE", weld.line, key))
    if (values.weld_number !== "") records.push({ role: "weld", lineNumber: weld.line, fileName, values })
  })
  return { records, issues }
}
