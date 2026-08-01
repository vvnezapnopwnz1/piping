export type Delimiter = "\t" | ","
export function detectDelimiter(firstLine: string): Delimiter { return (firstLine.match(/,/g) ?? []).length > (firstLine.match(/\t/g) ?? []).length ? "," : "\t" }
export function parseDelimited(text: string): string[][] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []
  const delimiter = detectDelimiter(lines[0])
  return lines.map((line) => line.split(delimiter).map((cell) => cell.trim()))
}
