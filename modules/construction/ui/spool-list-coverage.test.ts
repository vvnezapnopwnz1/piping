import assert from "node:assert/strict"
import test from "node:test"
import { globSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

/**
 * Spools are the row type this product has the most of — a real project runs to thousands, and
 * every fabrication and erection screen starts by asking the operator to find one. They were all
 * being listed either as a `<ul>` of buttons behind a substring filter, or as a bare `<table>`
 * with no sort, no paging and no way to narrow by anything but the number you already knew.
 *
 * This pins the shape rather than any one screen: a surface that lists spools goes through the
 * shared table, so search, sort, filter, paging and density arrive with it.
 */
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))

const sources = globSync("modules/**/ui/**/*.tsx", { cwd: repoRoot }).map((file) => ({
  file,
  source: readFileSync(repoRoot + file, "utf8"),
}))

/**
 * A file that lists spools, as opposed to one that merely mentions a spool number in a heading or
 * a detail line: it has to be rendering a collection of them.
 */
const listsSpools = (source: string) =>
  /\.map\(\s*\(?\s*(row|spool|status|ob)\b/.test(source) &&
  /spoolNumber/.test(source) &&
  // A detail table keyed on something else — weld joints, supports, material lines — only carries
  // the spool number as a column of context.
  !/weldJointRevisionId|supportRevisionId|materialLineId/.test(source)

/**
 * Not every list of spools is a worklist. A pane that expands one accepted revision into its
 * spools is bounded by the ISO, not by the project, and each entry is a multi-line card carrying
 * that spool's welds, supports, flanges and ident codes — a toolbar and a pagination footer over
 * six of those would be furniture, not help. Anything added here needs a reason of that shape.
 */
const EXEMPT = new Map<string, string>([
  [
    "modules/engineering/ui/engineering-browser.tsx",
    "expands one selected ISO revision into its spool graph — bounded by the revision, and each " +
      "entry is a detail card rather than a row",
  ],
])

test("every screen that lists spools uses the shared table", () => {
  const offenders = sources
    .filter(({ file }) => !EXEMPT.has(file))
    .filter(({ source }) => listsSpools(source))
    .filter(({ source }) => !/DataTable|RecordSelectTable/.test(source))
    .map(({ file }) => file)

  assert.deepEqual(
    offenders,
    [],
    "these list spools without the shared table, so they have no sort, filter or paging",
  )
})

test("no spool list has gone back to a hand-rolled scrolling <ul>", () => {
  const offenders = sources
    .filter(({ file }) => !EXEMPT.has(file))
    .filter(({ source }) => listsSpools(source) && /<ul className="max-h-/.test(source))
    .map(({ file }) => file)

  assert.deepEqual(offenders, [], "a capped scroll box is not a substitute for paging")
})

/**
 * The two pickers sit above the form the operator is about to fill in, so the table folds away
 * once a spool is chosen. Without that the form starts below a full page of rows.
 *
 * Browsing is controlled by the screen rather than held in the table, and that is the point: going
 * back to the list has to take the joint list and the record form with it. Leaving them on screen
 * showed the previous spool's joints under a spool picker that was open to replace it.
 */
test("the spool picker folds away once a spool is chosen", () => {
  const shared = readFileSync(repoRoot + "components/ui/data-table/record-select-table.tsx", "utf8")

  assert.match(shared, /onBrowsingChange\(false\)/, "selecting a spool must collapse the table")
  assert.match(shared, /Change spool/, "and there must be a way back to it")
  assert.match(
    shared,
    /const open = browsing \|\| selected === null/,
    "with nothing selected there is nothing to fold, so the table must open on its own",
  )
  assert.doesNotMatch(
    shared,
    /useState/,
    "browsing must not be held here — the screen needs it to hide everything below",
  )
})

test("browsing for another spool hides everything that belongs to the old one", () => {
  const screens = [
    "modules/construction/ui/fabrication/weld-progress-screen.tsx",
    "modules/construction/ui/fabrication/qc-release-screen.tsx",
    "modules/construction/ui/fabrication/material-check-screen.tsx",
    "modules/construction/ui/fabrication/paint-laydown-screen.tsx",
  ]
  for (const file of screens) {
    const source = readFileSync(repoRoot + file, "utf8")
    assert.match(
      source,
      /\{spool && !browsingSpools \? \(/,
      `${file} must drop the joint list and the form while the spool list is open`,
    )
  }

  const shell = readFileSync(
    repoRoot + "modules/construction/ui/erection/erection-screen-shell.tsx",
    "utf8",
  )
  assert.match(shell, /selected && !browsingSpools \? \(/, "the erection shell must do the same")
})

/**
 * Opening a screen with a spool already chosen puts a record form in front of the operator
 * pointing at something they never picked — and because both phases list the same project in the
 * same order, the row it lands on is usually whatever they had open in the other module, which
 * looks exactly like state leaking across modules.
 */
test("no worklist opens with a record the operator did not choose", () => {
  const owners = [
    "modules/construction/ui/erection/use-erection-readiness.ts",
    "modules/flange/ui/flange-management-screen.tsx",
  ]

  for (const file of owners) {
    const source = readFileSync(repoRoot + file, "utf8")
    assert.doesNotMatch(
      source,
      /(next|nextRows)\[0\]\?\./,
      `${file} must keep the current selection or clear it, never pick a row on its own`,
    )
    assert.match(
      source,
      /\? current : null/,
      `${file} keeps a selection that survived the reload and clears anything else`,
    )
  }
})
