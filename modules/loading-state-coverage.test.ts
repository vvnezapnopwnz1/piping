import assert from "node:assert/strict"
import test from "node:test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { join } from "node:path"

/**
 * A screen that fetches on mount and renders nothing while the request is in flight is
 * indistinguishable from a screen whose query legitimately returned no rows: the operator reads
 * "No spools match this project" and cannot tell whether that is the answer or the question.
 *
 * `components/ui/skeleton.tsx` already existed and was adopted by only 7 of the 28 screens, so this
 * is inconsistent use of an existing pattern rather than a missing primitive. One tree-wide test
 * rather than 21 near-duplicates, so a newly added screen is covered the day it lands.
 */
const modulesDir = fileURLToPath(new URL(".", import.meta.url))

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

const screens = walk(modulesDir)
  .filter((path) => /\/ui\/.*(screen|tabs)\.tsx$/.test(path))
  .sort()

// A screen with only local form state and no mount-time fetch has nothing to wait for.
const FETCHES_DATA = /useEffect\(/

/**
 * Some screens do not own their mount-time fetch: they hand it to a shared frame that renders the
 * picker, the loading state and the "nothing selected" state on their behalf. Requiring a Skeleton
 * in the screen file itself would force a second, redundant indicator for a fetch the screen does
 * not perform, so delegating to one of these counts as covered — and each is itself asserted below.
 */
const LOADING_OWNERS = ["ErectionScreenShell", "SpoolPicker"]

/**
 * Screens whose only `useEffect` is not a mount-time fetch, so the heuristic above catches them by
 * accident. Each needs a stated reason — "it looked noisy" is not one.
 */
const EXEMPT = new Map<string, string>([
  [
    "modules/documents/ui/reports-screen.tsx",
    "reads nothing on mount — its effect only invalidates the request version on unmount, and " +
      "report generation is an explicit per-button action already tracked by `pendingCode`",
  ],
])

test("the audit still covers the screens it was written against", () => {
  assert.ok(screens.length >= 28, `expected at least 28 screens, found ${screens.length}`)
})

test("every shared frame a screen may delegate its loading state to actually renders one", () => {
  // field-spool-picker.tsx is deliberately excluded: it is handed its rows and owns no fetch, so
  // the loading state for that list belongs to the shell above it.
  const owners = walk(modulesDir).filter((path) =>
    /(erection-screen-shell|fabrication\/spool-picker)\.tsx$/.test(path),
  )
  assert.equal(owners.length, 2, "both shared loading owners must exist")
  for (const path of owners) {
    assert.ok(
      readFileSync(path, "utf8").includes("Skeleton"),
      `${path} is trusted by screens to render their loading state and must render a Skeleton`,
    )
  }
})

for (const path of screens) {
  const source = readFileSync(path, "utf8")
  if (!FETCHES_DATA.test(source)) continue
  const relative = path.slice(path.indexOf("modules/"))
  if (EXEMPT.has(relative)) continue
  test(`${relative} shows a loading indicator for its data fetch`, () => {
    assert.ok(
      source.includes("Skeleton") || LOADING_OWNERS.some((owner) => source.includes(owner)),
      `${relative} fetches on mount but renders no Skeleton fallback and delegates to no shared frame that does, so its empty state and its loading state look identical`,
    )
  })
}
