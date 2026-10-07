const norm = (text: string) => text.toLowerCase().replace(/[\s/]+/g, "")

/** Timeline sub-lines worth showing: a line that only repeats its step's title adds nothing. */
export function timelineLines(
  title: string,
  lines: readonly { label: string; value: string | null }[],
): { label: string; value: string | null }[] {
  return lines.filter((line) => norm(line.label) !== norm(title))
}
