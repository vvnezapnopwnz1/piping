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

/**
 * Column lists shared by more than one read live in a module-level constant, so resolve those
 * too. Only literal single-string constants are understood: anything built at runtime is
 * outside what this guard can check, and `assertResolvable` below fails rather than skipping it.
 */
function readStringConstants(input: string): Map<string, string> {
  const result = new Map<string, string>()
  for (const match of input.matchAll(
    /^const (\w+)(?::\s*string)?\s*=\s*\n?\s*("(?:[^"\\]|\\.)*")\s*$/gm,
  )) {
    result.set(match[1], JSON.parse(match[2]) as string)
  }
  return result
}

const relations = readRelationColumns(types)
const constants = readStringConstants(source)

const selects = [
  ...source.matchAll(/\.from\("(\w+)"\)\s*\n?\s*\.select\(\s*\n?\s*("(?:[^"\\]|\\.)*"|\w+)/g),
].map((match) => {
  const argument = match[2]
  const select = argument.startsWith('"')
    ? (JSON.parse(argument) as string)
    : constants.get(argument)
  assert.ok(
    select !== undefined,
    `.select(${argument}) does not resolve to a literal column list, so its columns are unchecked`,
  )
  return { relation: match[1], select }
})
// Both readiness reads — one spool, one project — must be found. The field weld and field
// support reads that used to live here were copies of loadWeldSummaries and loadSupports and
// are covered by construction-select-columns.test.ts instead.
assert.ok(
  selects.length >= 2,
  `expected both erection readiness selects, found ${selects.length}`,
)
// The readiness projection is the one this module exists for: if its column list stops being
// resolvable, the guard silently checks nothing.
assert.ok(
  selects.some(
    ({ relation, select }) =>
      relation === "spool_erection_readiness" && select.includes("material_line_total"),
  ),
  "the erection readiness select must be checked, not skipped",
)
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
