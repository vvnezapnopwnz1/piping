import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

// Why this test exists: supabase-js 2.110.8 does not type-check .select() strings.
// A wrong column name in a .select() compiles with tsc exiting 0, runs fine until
// PostgREST returns a 400, and the error is invisible to pgTAP.
// This file asserts every .select() in supabase-quality-repository.ts against the
// generated types — the same guard that protected the construction module since 2026-08-02.

const here = dirname(fileURLToPath(import.meta.url))
const repositorySource = readFileSync(resolve(here, "supabase-quality-repository.ts"), "utf8")
const typesSource = readFileSync(resolve(here, "../../../lib/supabase/database.types.ts"), "utf8")

function readRelationColumns(source: string): Map<string, Set<string>> {
  const relations = new Map<string, Set<string>>()
  const lines = source.split("\n")
  for (let index = 0; index < lines.length; index += 1) {
    const header = /^ {6}(\w+): \{$/.exec(lines[index])
    if (!header) continue
    if (!/^ {8}Row: \{$/.test(lines[index + 1] ?? "")) continue
    const columns = new Set<string>()
    for (let cursor = index + 2; cursor < lines.length; cursor += 1) {
      if (/^ {8}\}$/.test(lines[cursor])) break
      const column = /^ {10}(\w+)\??: /.exec(lines[cursor])
      if (column) columns.add(column[1])
    }
    relations.set(header[1], columns)
  }
  return relations
}

function readSelects(source: string): { relation: string; select: string }[] {
  const found: { relation: string; select: string }[] = []
  const pattern = /\.from\("(\w+)"\)\s*\n?\s*\.select\(\s*\n?\s*("(?:[^"\\]|\\.)*")/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    found.push({ relation: match[1], select: JSON.parse(match[2]) as string })
  }
  return found
}

function topLevelNames(select: string): string[] {
  const names: string[] = []
  let depth = 0
  let token = ""
  for (const character of select) {
    if (character === "(") {
      if (depth === 0 && token.trim()) names.push(token.trim())
      token = ""
      depth += 1
    } else if (character === ")") {
      depth -= 1
    } else if (character === "," && depth === 0) {
      if (token.trim()) names.push(token.trim())
      token = ""
    } else if (depth === 0) {
      token += character
    }
  }
  if (token.trim()) names.push(token.trim())
  return names
}

const relations = readRelationColumns(typesSource)
const selects = readSelects(repositorySource)

assert.ok(relations.size > 20, `expected many relations in the generated types, got ${relations.size}`)
assert.ok(selects.length >= 2, `expected at least 2 selects, found ${selects.length}`)

// The guard: nde_batches.status is a real column; a typo like "statuss" must fail.
const ndeBatches = relations.get("nde_batches")
assert.ok(ndeBatches, "nde_batches missing from the generated types")
assert.ok(ndeBatches.has("status"), "nde_batches must have status column")
assert.ok(ndeBatches.has("batch_number"), "nde_batches must have batch_number column")
assert.ok(!ndeBatches.has("batch_no"), "nde_batches must NOT have batch_no (wrong name)")

for (const { relation, select } of selects) {
  const columns = relations.get(relation)
  assert.ok(columns, `${relation} is selected from but absent from the generated types`)
  if (select.trim() === "*") continue
  for (const name of topLevelNames(select)) {
    const bare = name.replace(/!inner$/, "").replace(/!left$/, "")
    if (relations.has(bare)) continue // an embedded relation, not a column
    assert.ok(
      columns.has(bare),
      `${relation}.select names "${bare}", which is not a column of ${relation}`,
    )
  }
}

console.log(
  `All quality-select-columns.test.ts assertions passed! (${selects.length} selects checked)`,
)
