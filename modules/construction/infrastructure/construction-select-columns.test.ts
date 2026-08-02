import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

// Why this test exists: on 2026-08-02 loadMaterialCheckItems selected ident_code,
// trace_number and quantity from material_check_items, which has none of them. PostgREST
// answered 400, the material-check screen lost its bill of materials with it, and the
// whole fabrication golden path was blocked — while every automated check stayed green.
// @supabase/supabase-js 2.110.8 does not type-check .select() strings (measured with a
// throwaway probe: a deliberately wrong select compiles with tsc exiting 0), pgTAP tests
// SQL rather than PostgREST, and the unit tests mock the client.
//
// This asserts every .select() in the construction repository against the generated types.

const here = dirname(fileURLToPath(import.meta.url))
const repositorySource = readFileSync(resolve(here, "supabase-construction-repository.ts"), "utf8")
const typesSource = readFileSync(resolve(here, "../../../lib/supabase/database.types.ts"), "utf8")

// Build {relation -> Set<column>} from the generated types. The file is machine-generated
// and regular: `      name: {` then `        Row: {` then one `          column: type` per
// line until the Row block closes.
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

// Every `.from("x")` with the `.select("...")` that follows it.
function readSelects(source: string): { relation: string; select: string }[] {
  const found: { relation: string; select: string }[] = []
  const pattern = /\.from\("(\w+)"\)\s*\n?\s*\.select\(\s*\n?\s*("(?:[^"\\]|\\.)*")/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    found.push({ relation: match[1], select: JSON.parse(match[2]) as string })
  }
  return found
}

// Top-level names only. An embedded relation `supports(support_number)` is checked as a
// relation name; its inner columns are PostgREST's business.
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
assert.ok(selects.length >= 13, `expected at least 13 selects, found ${selects.length}`)

// The parser must be able to see the exact defect of 2026-08-02.
const materialCheckItems = relations.get("material_check_items")
assert.ok(materialCheckItems, "material_check_items missing from the generated types")
assert.ok(!materialCheckItems.has("ident_code"), "material_check_items must not have ident_code")
assert.ok(!materialCheckItems.has("trace_number"), "material_check_items must not have trace_number")
assert.ok(materialCheckItems.has("checked_quantity"), "material_check_items must have checked_quantity")

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
  `All construction-select-columns.test.ts assertions passed! (${selects.length} selects checked)`,
)
