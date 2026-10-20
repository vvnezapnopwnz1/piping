export type Delimiter = "\t" | ";" | ","
const DELIMITERS: readonly Delimiter[] = ["\t", ";", ","]
const LINE_BREAK = /\r\n|\r|\n/
// The most frequent delimiter outside quotes wins; a tie goes to the earlier one in tab, semicolon, comma order.
export function detectDelimiter(firstLine: string): Delimiter {
  const counts = new Map<string, number>(DELIMITERS.map((delimiter) => [delimiter, 0])); let quoted = false
  for (const char of firstLine) { if (char === '"') quoted = !quoted; else if (!quoted && counts.has(char)) counts.set(char, counts.get(char)! + 1) }
  return DELIMITERS.reduce((best, delimiter) => (counts.get(delimiter)! > counts.get(best)! ? delimiter : best))
}
// A quote opens a quoted cell only at the start of a cell, so an inch mark inside a value (6" SCH40) stays literal.
export function parseDelimited(text: string): string[][] {
  const source = text.replace(/^﻿/, ""); const delimiter = detectDelimiter(source.split(LINE_BREAK, 1)[0])
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false
  const endCell = () => { row.push(cell.trim()); cell = "" }
  const endRow = () => { endCell(); if (row.length > 1 || row[0] !== "") rows.push(row); row = [] }
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quoted) { if (char !== '"') cell += char; else if (source[index + 1] === '"') { cell += '"'; index += 1 } else quoted = false }
    else if (char === '"' && cell.trim() === "") { quoted = true; cell = "" }
    else if (char === delimiter) endCell()
    else if (char === "\n" || char === "\r") { if (char === "\r" && source[index + 1] === "\n") index += 1; endRow() }
    else cell += char
  }
  if (cell !== "" || row.length > 0) endRow()
  return rows
}
