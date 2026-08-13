import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

/**
 * Tailwind v4's preflight carries no `cursor: pointer` for <button>, and the browser default is
 * an arrow, so every control in the app read as static text unless it set the cursor itself.
 * None of them did: not the shared Button, and not one of the twenty hand-written <button>
 * elements that make up the pickers and sub-tab strips.
 *
 * A base rule fixes all of them at once, which is why it is pinned here rather than per widget.
 */

const globals = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8")

test("buttons declare a pointer cursor in the base layer", () => {
  assert.match(
    globals,
    /button[^}]*cursor-pointer/,
    "app/globals.css must restore the pointer cursor Tailwind v4 no longer ships",
  )
})

/**
 * A list whose rows open an editor needs more than a cursor: the row has to react under the
 * pointer, show where the keyboard is, and tell assistive technology which one is selected. Both
 * spool pickers shipped with none of that, and now neither of them draws a row at all — they hand
 * their spools to `DataTable`, so the affordances are asserted where they actually live.
 */
const PICKERS = [
  "../../modules/construction/ui/fabrication/spool-picker.tsx",
  "../../modules/construction/ui/erection/field-spool-picker.tsx",
]

test("the spool pickers delegate their rows to the shared table", () => {
  for (const picker of PICKERS) {
    const source = readFileSync(new URL(picker, import.meta.url), "utf8")

    assert.match(
      source,
      /RecordSelectTable/,
      `${picker} must render the shared spool table rather than its own list`,
    )
    assert.match(source, /onSelect=/, `${picker} must still report the chosen spool`)
    assert.match(source, /selectedId=/, `${picker} must still mark the chosen spool`)
  }
})

test("the shared table gives a clickable row every state a selection list needs", () => {
  const dataTable = readFileSync(new URL("./data-table/data-table.tsx", import.meta.url), "utf8")
  const table = readFileSync(new URL("./table.tsx", import.meta.url), "utf8")

  assert.match(
    dataTable,
    /interactive=\{Boolean\(onRowClick\)\}/,
    "a row that opens something must declare itself interactive",
  )
  assert.match(
    dataTable,
    /aria-current=\{selectedRowId === id \? 'true' : undefined\}/,
    "the selected row must announce itself, not only tint itself",
  )
  assert.match(dataTable, /data-state=\{selectedRowId === id/, "and it must be visibly selected")

  assert.match(table, /hover:bg-accent/, "an interactive row must react under the pointer")
  assert.match(table, /focus-visible:ring-2/, "and must show where the keyboard is")
})
