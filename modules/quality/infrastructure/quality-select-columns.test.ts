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

interface SelectNode {
  name: string
  children: SelectNode[]
}

/**
 * Parses a PostgREST select string into its tree of names, so an embedded relation is
 * checked against its own columns rather than skipped. `spool_revisions(spools(spool_no))`
 * compiles, passes a top-level-only check, and 400s at runtime — which is the whole class
 * of defect this file exists to catch.
 */
function parseSelect(select: string): SelectNode[] {
  const nodes: SelectNode[] = []
  const stack: SelectNode[][] = [nodes]
  let token = ""
  const flush = (): void => {
    if (token.trim()) stack[stack.length - 1].push({ name: token.trim(), children: [] })
    token = ""
  }
  for (const character of select) {
    if (character === "(") {
      const parent: SelectNode = { name: token.trim(), children: [] }
      stack[stack.length - 1].push(parent)
      token = ""
      stack.push(parent.children)
    } else if (character === ")") {
      flush()
      stack.pop()
    } else if (character === ",") {
      flush()
    } else {
      token += character
    }
  }
  flush()
  return nodes
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

function checkNodes(relation: string, nodes: SelectNode[], path: string): void {
  const columns = relations.get(relation)
  assert.ok(columns, `${path} embeds "${relation}", which is absent from the generated types`)
  for (const node of nodes) {
    const bare = node.name.replace(/!inner$/, "").replace(/!left$/, "")
    if (node.children.length > 0) {
      assert.ok(
        relations.has(bare),
        `${path} embeds "${bare}", which is not a relation in the generated types`,
      )
      checkNodes(bare, node.children, `${path} -> ${bare}`)
      continue
    }
    if (relations.has(bare)) continue // an embedded relation selected whole
    assert.ok(columns.has(bare), `${path} names "${bare}", which is not a column of ${relation}`)
  }
}

for (const { relation, select } of selects) {
  assert.ok(
    relations.get(relation),
    `${relation} is selected from but absent from the generated types`,
  )
  if (select.trim() === "*") continue
  checkNodes(relation, parseSelect(select), `${relation}.select`)
}

// The guard guards: a nested column that does not exist must be caught, not skipped.
assert.throws(
  () => checkNodes("nde_obligations", parseSelect("spool_revisions(spools(spool_no))"), "probe"),
  /spool_no/,
  "a wrong column inside an embedded relation must fail the guard",
)

console.log(
  `All quality-select-columns.test.ts assertions passed! (${selects.length} selects checked)`,
)
