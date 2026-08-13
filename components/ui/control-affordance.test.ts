import assert from "node:assert/strict"
import test from "node:test"
import { globSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

/** globSync returns paths relative to `cwd`, so they are rejoined before being opened. */
const repoRoot = fileURLToPath(new URL("../../", import.meta.url))
const sourcesUnder = (pattern: string) =>
  globSync(pattern, { cwd: repoRoot }).map((file) => ({
    file,
    source: readFileSync(repoRoot + file, "utf8"),
  }))

/**
 * Every screen used to report an in-flight save by swapping the button's label for "Saving…".
 * That changes the button's width under the operator's pointer, offers no progress, and on the
 * screens that forgot to also disable it left a second click able to record the same weld twice.
 */
test("the button reports work in flight without moving", () => {
  const source = read("./button.tsx")

  assert.match(source, /loading\?: boolean/, "Button must take a loading flag")
  assert.match(source, /aria-busy=\{loading \|\| undefined\}/, "assistive tech must hear it too")
  assert.match(
    source,
    /disabled=\{asChild \? disabled : loading \|\| disabled\}/,
    "a loading button must refuse a second press",
  )
  assert.match(source, /animate-spin/, "there must be a spinner, not just a dead button")
})

/**
 * `asChild` swaps the element for a Radix Slot, and a Slot accepts exactly one child — including
 * the `null` an inline conditional leaves behind. Getting this wrong took the whole `/admin`
 * prerender down with React error #143, so it is pinned rather than left to the next build.
 */
test("an asChild button passes its child through untouched", () => {
  const source = read("./button.tsx")
  assert.match(
    source,
    /\{asChild \? \(\s*children\s*\) : \(/,
    "under asChild the children must reach the Slot unwrapped",
  )
})

/** Screens that still swap a label are screens that still resize mid-click. */
test("no screen reports saving by rewriting its own label", () => {
  const offenders = sourcesUnder("{app,modules,components}/**/*.tsx")
    .filter(({ source }) => /\?\s*"[A-Za-z]+…"\s*:/.test(source))
    .map(({ file }) => file)

  assert.deepEqual(offenders, [], "these must use <Button loading> instead of a label swap")
})

/**
 * Three screens drew the underline tab strip out of bare <button> elements, which gave them no
 * tab roles, no arrow-key movement and no aria-selected. The look is now a variant of the real
 * component, so there is no reason for a hand-rolled strip to come back.
 */
test("tabs come from the shared component, in one of its two looks", () => {
  const tabs = read("./tabs.tsx")
  assert.match(tabs, /variant\?: TabsVariant/, "Tabs must offer the underline look")
  assert.match(tabs, /'pill' \| 'underline'/, "both levels of nesting need their own look")

  const offenders = sourcesUnder("{app,modules}/**/*.tsx")
    .filter(({ source }) => /className=\{`pb-2 border-b-2/.test(source))
    .map(({ file }) => file)

  assert.deepEqual(offenders, [], "these still hand-roll a tab strip out of <button> elements")
})
