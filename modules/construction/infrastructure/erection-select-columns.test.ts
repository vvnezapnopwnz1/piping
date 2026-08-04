import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(here, "supabase-erection-repository.ts"), "utf8")
const types = readFileSync(resolve(here, "../../../lib/supabase/database.types.ts"), "utf8")

function readRelationColumns(input: string): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  const lines = input.split("\n")
  for (let i = 0; i < lines.length; i += 1) {
    const relation = /^ {6}(\w+): \{$/.exec(lines[i])
    if (!relation || !/^ {8}Row: \{$/.test(lines[i + 1] ?? "")) continue
    const columns = new Set<string>()
    for (let j = i + 2; j < lines.length && !/^ {8}\}$/.test(lines[j]); j += 1) {
      const column = /^ {10}(\w+)\??: /.exec(lines[j])
      if (column) columns.add(column[1])
    }
    result.set(relation[1], columns)
  }
  return result
}

function splitTopLevel(select: string): string[] {
  const parts: string[] = []
  let depth = 0
  let token = ""
  for (const char of select) {
    if (char === "(") depth += 1
    if (char === ")") depth -= 1
    if (char === "," && depth === 0) {
      if (token.trim()) parts.push(token.trim())
      token = ""
    } else token += char
  }
  if (token.trim()) parts.push(token.trim())
  return parts
}

function relationAndNestedColumns(part: string): { relation: string; columns: string[] } | null {
  const match = /^(\w+)(?:!\w+)?\((.*)\)$/.exec(part)
  if (!match) return null
  return { relation: match[1], columns: splitTopLevel(match[2]).map((column) => column.trim()) }
}

const relations = readRelationColumns(types)
const selects = [...source.matchAll(/\.from\("(\w+)"\)\s*\n?\s*\.select\(\s*\n?\s*("(?:[^"\\]|\\.)*")/g)].map(
  (match) => ({ relation: match[1], select: JSON.parse(match[2]) as string }),
)
assert.ok(selects.length >= 3, "expected erection repository to contain several selects")
for (const { relation, select } of selects) {
  const columns = relations.get(relation)
  assert.ok(columns, `${relation} is selected from but absent from generated types`)
  if (select.trim() === "*") continue
  for (const part of splitTopLevel(select)) {
    const nested = relationAndNestedColumns(part)
    if (nested) {
      assert.ok(relations.has(nested.relation), `${nested.relation} nested relation is absent from generated types`)
      for (const nestedColumn of nested.columns) {
        const bare = nestedColumn.replace(/!\w+$/, "")
        if (bare.includes("(")) continue
        assert.ok(
          relations.get(nested.relation)?.has(bare),
          `${nested.relation}.${bare} is not a generated column`,
        )
      }
      continue
    }
    assert.ok(columns.has(part.replace(/!\w+$/, "")), `${relation}.${part} is not a generated column`)
  }
}
