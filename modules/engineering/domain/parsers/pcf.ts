export type PcfBoreUnit = "INCH" | "MM" | "INCH-SIXTEENTH"
export interface PcfRecord { keyword: string; value: string; line: number }
export interface PcfBlock { keyword: string; value: string; line: number; attributes: PcfRecord[] }
export interface PcfPoint { x: number; y: number; z: number; bore: number | null; endType: string | null }
export interface PcfFile { header: PcfRecord[]; pipelines: PcfBlock[]; components: PcfBlock[]; materials: PcfBlock[]; boreUnit: PcfBoreUnit | null }
const BORE_UNITS: readonly string[] = ["INCH", "MM", "INCH-SIXTEENTH"]
const LINE_BREAK = /\r\n|\r|\n/
const toNumber = (token: string | undefined): number | null => { const value = token ? Number(token) : NaN; return Number.isFinite(value) ? value : null }
// A PCF line is a keyword and the rest of the line; a leading space or tab marks an attribute of the item above. Keywords are stored upper-case, so a reader of the result compares them exactly.
// An item with no attribute before the first pipeline is file header. Right after a PIPELINE-REFERENCE that has no indented attribute of its own, items with no attribute describe that pipeline (Plant 3D writes them at column 1).
// MATERIALS is a switch: every item after it is a material, until the next PIPELINE-REFERENCE. An item the reader does not know stays a component.
export function parsePcf(text: string): PcfFile {
  const file: PcfFile = { header: [], pipelines: [], components: [], materials: [], boreUnit: null }
  let open: PcfBlock | null = null; let inMaterials = false; let pipelineOpen = false
  // Whether an item has attributes is known only when the next item starts, so each one is placed when it ends.
  const place = (block: PcfBlock) => {
    const record: PcfRecord = { keyword: block.keyword, value: block.value, line: block.line }; const bare = block.attributes.length === 0
    if (block.keyword === "PIPELINE-REFERENCE") { file.pipelines.push(block); pipelineOpen = bare; inMaterials = false }
    else if (block.keyword === "MATERIALS") inMaterials = true
    else if (inMaterials) file.materials.push(block)
    else if (bare && pipelineOpen) file.pipelines[file.pipelines.length - 1].attributes.push(record)
    else if (bare && file.pipelines.length === 0) file.header.push(record)
    else { if (!bare) pipelineOpen = false; file.components.push(block) }
  }
  const lines = text.split(LINE_BREAK)
  for (let index = 0; index < lines.length; index += 1) {
    const content = lines[index].trim(); if (content === "") continue
    const gap = content.search(/\s/); const keyword = (gap < 0 ? content : content.slice(0, gap)).toUpperCase()
    const record: PcfRecord = { keyword, value: gap < 0 ? "" : content.slice(gap).trim(), line: index + 1 }
    if (/^[ \t]/.test(lines[index])) { open?.attributes.push(record); continue }
    if (open) place(open)
    open = { ...record, attributes: [] }
  }
  if (open) place(open)
  const unit = file.header.find((record) => record.keyword === "UNITS-BORE")?.value.toUpperCase()
  if (unit !== undefined && BORE_UNITS.includes(unit)) file.boreUnit = unit as PcfBoreUnit
  return file
}
// The first value of an attribute, the key read in any letter case; null when the block has none.
export function attribute(block: PcfBlock, keyword: string): string | null {
  return block.attributes.find((record) => record.keyword === keyword.toUpperCase())?.value ?? null
}
// END-POINT x y z [bore [end type]]. A number is read with a decimal point only, so a bore written 4,0000 is unknown; an end point with no readable coordinates is skipped.
export function endPoints(block: PcfBlock): PcfPoint[] {
  const points: PcfPoint[] = []
  for (const record of block.attributes) {
    if (record.keyword !== "END-POINT") continue
    const tokens = record.value.split(/\s+/); const [x, y, z] = [toNumber(tokens[0]), toNumber(tokens[1]), toNumber(tokens[2])]
    if (x !== null && y !== null && z !== null) points.push({ x, y, z, bore: toNumber(tokens[3]), endType: tokens[4]?.toUpperCase() ?? null })
  }
  return points
}
