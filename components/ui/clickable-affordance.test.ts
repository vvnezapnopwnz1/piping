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
 * pointer and show where the keyboard is. Both spool pickers shipped with neither, so their
 * selected item was the only styled state.
 */
const PICKERS = [
  "../../modules/construction/ui/fabrication/spool-picker.tsx",
  "../../modules/construction/ui/erection/field-spool-picker.tsx",
]

test("the spool pickers show hover, focus and selection state", () => {
  for (const picker of PICKERS) {
    const source = readFileSync(new URL(picker, import.meta.url), "utf8")

    assert.match(source, /hover:bg-/, `${picker} must react under the pointer`)
    assert.match(source, /focus-visible:/, `${picker} must show keyboard focus`)
    assert.match(
      source,
      /aria-current/,
      `${picker} must expose the selected spool to assistive technology, not only as a tint`,
    )
  }
})
