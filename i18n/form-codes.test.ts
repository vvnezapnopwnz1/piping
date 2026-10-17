import assert from "node:assert/strict"
import test from "node:test"
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

const BANNED_FORM_CODES = /\bQC-?13\b|\bW-?10P\b|\bW-?2[34]\b/i

type ValueEntry = { keyPath: string; value: string }

function walk(tree: unknown, prefix = ""): ValueEntry[] {
  if (typeof tree === "string") {
    return [{ keyPath: prefix, value: tree }]
  }
  if (typeof tree === "object" && tree !== null && !Array.isArray(tree)) {
    const entries: ValueEntry[] = []
    for (const [key, value] of Object.entries(tree)) {
      const nextPath = prefix ? `${prefix}.${key}` : key
      entries.push(...walk(value, nextPath))
    }
    return entries
  }
  return []
}

/**
 * Strips ICU argument placeholders (e.g. `{qc13}`, `{form}`) so that code identifiers
 * passed as parameters are not confused with user-facing text.
 */
function stripIcuArguments(message: string): string {
  return message.replace(/\{[a-zA-Z0-9_]+\}/g, "")
}

test("ui text carries no foreign form codes", () => {
  const baseDir = join(import.meta.dirname, "..")
  const locales = ["en", "ru"]
  const violations: { file: string; keyPath: string; value: string }[] = []

  for (const locale of locales) {
    const dir = join(baseDir, "messages", locale)
    const files = readdirSync(dir).filter((file) => file.endsWith(".json")).sort()
    for (const file of files) {
      const fullPath = join(dir, file)
      const relPath = relative(baseDir, fullPath)
      const json = JSON.parse(readFileSync(fullPath, "utf-8"))
      for (const { keyPath, value } of walk(json)) {
        if (BANNED_FORM_CODES.test(stripIcuArguments(value))) {
          violations.push({ file: relPath, keyPath, value })
        }
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found foreign form codes in UI messages:\n${violations.map((v) => `  ${v.file} [${v.keyPath}]: ${v.value}`).join("\n")}`
  )
})
