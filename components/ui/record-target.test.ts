import assert from "node:assert/strict"
import test from "node:test"
import { globSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
const repoRoot = fileURLToPath(new URL("../../", import.meta.url))

/**
 * Switching which record a form writes to used to change one word in a heading. The fields kept
 * their shape and their position, so an operator who had already started typing had no reason to
 * believe the target had moved — and on these screens that is a weld recorded against the wrong
 * joint, not a moment of confusion.
 */
test("changing the target is reported four ways, not one", () => {
  const source = read("./record-target.tsx")

  assert.match(source, /animate-record-target-change/, "the card must flash")
  assert.match(source, /aria-live="polite"/, "the change must be announced without stealing focus")
  assert.match(source, /scrollIntoView/, "a form below the fold must be brought into view")
  assert.match(
    source,
    /prefers-reduced-motion/,
    "and all of that must stand down when motion is refused",
  )
})

test("the flash replays on every change and never on the first render", () => {
  const source = read("./record-target.tsx")

  assert.match(
    source,
    /key=\{flashCount\}/,
    "the overlay must remount to replay the animation, so two quick clicks both register",
  )
  assert.match(
    source,
    /if \(shownId\.current === id\) return/,
    "the form appearing is a change nobody can miss — flashing there spends the signal",
  )
  assert.match(
    source,
    /const \[flashCount, setFlashCount\]/,
    "what is drawn must come from state; a ref read during render is the bug this replaces",
  )
})

test("the animation is defined in both a moving and a still form", () => {
  const globals = readFileSync(repoRoot + "app/globals.css", "utf8")

  assert.match(globals, /@keyframes record-target-change/, "the flash needs its keyframes")
  assert.ok(
    /prefers-reduced-motion: reduce\)\s*\{\s*\.animate-record-target-change\s*\{\s*animation: none/.test(
      globals.replace(/\n/g, " ").replace(/\s+/g, " "),
    ),
    "and must be switched off when the viewer asks for less motion",
  )
})

/**
 * The identity is the heading on these screens, not a caption: folded away, the spool bar is the
 * only thing left saying which of several thousand everything below refers to.
 */
test("the identity is set as a headline", () => {
  const source = read("./record-target.tsx")

  assert.match(source, /font-mono text-xl leading-tight font-bold/, "big, bold and monospaced")
  assert.doesNotMatch(
    read("./data-table/record-select-table.tsx"),
    /truncate text-sm/,
    "the folded spool bar must not go back to a caption",
  )
})

/** A selection that drives the form beside it has to beat hover, not resemble it. */
test("the selected row outranks a hovered one", () => {
  const table = read("./table.tsx")

  assert.match(table, /data-\[state=selected\]:bg-primary\/10/, "a stronger tint than hover's")
  assert.match(table, /data-\[state=selected\]:font-medium/, "and heavier text")
  assert.match(
    table,
    /data-\[state=selected\]:\[&>td:first-child\]:shadow-\[inset_3px_0_0_var\(--primary\)\]/,
    "plus a leading bar that survives scrolling the table sideways",
  )
})

/** Every form that a table retargets has to carry the signal, or the gap just moves screens. */
test("every form a worklist retargets reports the change", () => {
  const retargeted = [
    "modules/construction/ui/fabrication/weld-progress-screen.tsx",
    "modules/construction/ui/erection/field-weld-progress-screen.tsx",
    "modules/flange/ui/flange-management-screen.tsx",
  ]

  for (const file of retargeted) {
    const source = readFileSync(repoRoot + file, "utf8")
    assert.match(source, /<ChangeHighlight/, `${file} must report which record it now edits`)
    assert.match(source, /<IdentityHeadline/, `${file} must name that record as a heading`)
  }
})

/** A screen that grows a record form later should not have to rediscover this. */
test("no retargetable form still announces itself with a bare CardTitle", () => {
  const offenders = globSync("modules/**/ui/**/*screen.tsx", { cwd: repoRoot })
    .filter((file) => {
      const source = readFileSync(repoRoot + file, "utf8")
      return /<CardTitle>Record \{/.test(source)
    })

  assert.deepEqual(
    offenders,
    [],
    "these still signal a change of target by rewriting a heading and nothing else",
  )
})
