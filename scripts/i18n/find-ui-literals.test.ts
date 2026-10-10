// scripts/i18n/find-ui-literals.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import { I18N_DONE_PATHS } from "@/i18n/coverage"

import { findUiLiterals, findUiLiteralsInSource, looksLikeProse } from "./find-ui-literals"

const texts = (source: string) => findUiLiteralsInSource("x.tsx", source).map((found) => found.text)

test("prose is a sentence or a capitalised word, not a code, key or class list", () => {
  for (const prose of ["Sign in", "Cancel", "No spools yet.", "Rft", "manual adjustment only"]) {
    assert.equal(looksLikeProse(prose), true, prose)
  }
  for (const code of ["NDE", "SP-1006-A", "fabrication.title", "start_fab", "flex items-center gap-2", "—", "PipeQC", "/fabrication", "0-0"]) {
    assert.equal(looksLikeProse(code), false, code)
  }
})

test("JSX text, text attributes, toasts, label maps and templates are reported", () => {
  assert.deepEqual(texts(`const a = <Button title="Open spool">Sign in</Button>`), ["Open spool", "Sign in"])
  assert.deepEqual(texts(`toast.error(failed ? "Could not save" : "Saved")`), ["Could not save", "Saved"])
  assert.deepEqual(texts(`const LABELS = { start_fab: "Start Fab", laydown: "Laydown" }`), ["Start Fab", "Laydown"])
  assert.deepEqual(texts("const a = <p>{`${count} welds open`}</p>"), ["0 welds open"])
})

test("markup, keys, comparisons, types and silenced calls are not reported", () => {
  assert.deepEqual(
    texts(`"use client"
import { x } from "Some Module"
const a = <div className="flex items-center" data-state="Open Now" key="Row One">{t("fabrication.title")}</div>
const b = status === "Not started" ? cn("px-2 py-1", "text-sm") : null
console.log("Loaded spools")
throw new Error("Spool not found")
type Mode = "Read only"`),
    [],
  )
})

test("an i18n-ignore comment silences its own line and the next one", () => {
  assert.deepEqual(
    texts(`// i18n-ignore — each language is named in itself
const NAMES = { en: "English", ru: "Русский" }`),
    [],
  )
})

test("translated areas hold no hard-coded English", () => {
  const found = findUiLiterals(I18N_DONE_PATHS).map((literal) => `${literal.file}:${literal.line} ${literal.text}`)
  assert.deepEqual(found, [])
})

import { existsSync, readdirSync } from "node:fs"

/** Every folder that holds screen code: the app, shared components, config, and each module's ui, application and domain. */
function screenRoots(): string[] {
  const layers = readdirSync("modules", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => ["ui", "application", "domain"].map((layer) => `modules/${entry.name}/${layer}`))
    .filter((path) => existsSync(path))
  return ["app", "components", "config", "contexts", ...layers]
}

test("every screen folder is checked as a whole", () => {
  assert.deepEqual(screenRoots().filter((root) => !I18N_DONE_PATHS.includes(root)), [])
})

