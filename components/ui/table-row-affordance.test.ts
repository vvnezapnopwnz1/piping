import assert from "node:assert/strict"
import test from "node:test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * A `<TableRow onClick={…}>` looks exactly like a static row: the base row already highlights
 * on hover, so that signal says nothing about clickability, and a bare <tr> is not reachable by
 * keyboard at all. Rows that open an editor were shipped with neither a pointer cursor nor a
 * focus ring, which is invisible to the type checker and to ESLint.
 *
 * `interactive` carries the whole affordance set, so the only thing worth pinning is that no
 * clickable row is declared without it.
 */

const ROOTS = ["app", "components", "modules"]

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

const sources = ROOTS.flatMap(walk).filter((path) => path.endsWith(".tsx"))

/**
 * A JSX prop value may itself contain ">" — `onClick={() => setSelected(row)}` does — so the
 * opening tag ends at the first ">" that sits outside any brace-delimited expression.
 */
function tableRowTags(source: string): string[] {
  const tags: string[] = []
  let start = source.indexOf("<TableRow")

  while (start !== -1) {
    let depth = 0
    let cursor = start

    while (cursor < source.length) {
      const char = source[cursor]
      if (char === "{") depth += 1
      else if (char === "}") depth -= 1
      else if (char === ">" && depth === 0) break
      cursor += 1
    }

    tags.push(source.slice(start, cursor))
    start = source.indexOf("<TableRow", cursor)
  }

  return tags
}

test("every clickable table row declares itself interactive", () => {
  const offenders: string[] = []

  for (const path of sources) {
    for (const tag of tableRowTags(readFileSync(path, "utf8"))) {
      if (tag.includes("onClick") && !tag.includes("interactive")) {
        offenders.push(path)
      }
    }
  }

  assert.deepEqual(
    [...new Set(offenders)],
    [],
    "a row that reacts to a click must pass `interactive` so it carries a cursor, a focus ring and keyboard activation",
  )
})

test("the interactive row carries pointer, keyboard and focus affordances", () => {
  const source = readFileSync(new URL("./table.tsx", import.meta.url), "utf8")

  for (const affordance of ["cursor-pointer", "focus-visible", "onKeyDown", "tabIndex"]) {
    assert.ok(
      source.includes(affordance),
      `the interactive row must provide ${affordance}`,
    )
  }

  assert.match(
    source,
    /role=\{interactive \? ['"]button['"]/,
    "an interactive row must announce itself as a button to assistive technology",
  )
})
