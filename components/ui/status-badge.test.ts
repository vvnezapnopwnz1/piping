import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

import { statusLabel, statusTone } from "./status-tone"

/**
 * Thirty-four badges across the app printed a status inside `variant="outline"`, which is the same
 * grey box whether the joint was accepted or rejected. The tone map is what makes a worklist
 * scannable, so the states that must never share a colour are pinned here.
 */
test("settled, in-flight and failed states take different tones", () => {
  assert.equal(statusTone("accepted"), "success")
  assert.equal(statusTone("rejected"), "danger")
  assert.equal(statusTone("open"), "info")
  assert.equal(statusTone("blocked"), "warning")
  assert.equal(statusTone("archived"), "neutral")
})

test("the three referential states each get their own tone", () => {
  const tones = ["active", "inactive", "archived"].map(statusTone)
  assert.deepEqual(tones, ["success", "warning", "neutral"])
  assert.equal(new Set(tones).size, 3, "a referential row's state must be readable at a glance")
})

/** The same status arrives spelled three ways depending on which view produced the row. */
test("status spelling does not change the tone", () => {
  for (const spelling of ["not_started", "NOT STARTED", "Not-Started", " not started "]) {
    assert.equal(statusTone(spelling), "neutral", spelling)
  }
})

test("an unknown or absent status is neutral rather than a crash", () => {
  assert.equal(statusTone(null), "neutral")
  assert.equal(statusTone(undefined), "neutral")
  assert.equal(statusTone(""), "neutral")
  assert.equal(statusTone("some_status_nobody_mapped"), "neutral")
})

test("labels are shown in the operator's spelling, not the database's", () => {
  assert.equal(statusLabel("not_started"), "Not started")
  assert.equal(statusLabel("IN_PROGRESS"), "In progress")
  assert.equal(statusLabel(null), "Unknown")
})

/**
 * A tone is only worth having if it survives the theme switch, so both blocks have to define it.
 * `ReferenceStatusBadge` shipped `emerald-500/15` literals that the dark block never redefined.
 */
const globals = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8")
const TONES = ["success", "warning", "info", "danger", "neutral"]
const lightBlock = globals.slice(globals.indexOf(":root {"), globals.indexOf(".dark {"))
const darkBlock = globals.slice(globals.indexOf(".dark {"), globals.indexOf("@theme inline"))

test("every status tone is defined in both themes", () => {
  for (const tone of TONES) {
    for (const role of ["fg", "bg", "border"]) {
      assert.match(lightBlock, new RegExp(`--${tone}-${role}:`), `light --${tone}-${role}`)
      assert.match(darkBlock, new RegExp(`--${tone}-${role}:`), `dark --${tone}-${role}`)
    }
  }
})

test("the status badge paints from tokens and always carries an icon", () => {
  const source = readFileSync(new URL("./status-badge.tsx", import.meta.url), "utf8")

  assert.doesNotMatch(
    source,
    /(bg|text|border)-(slate|zinc|gray|emerald|amber|sky|red|green|blue)-\d/,
    "status colours belong to the theme, not to a literal in the component",
  )
  assert.match(source, /icon = true/, "the icon must be opt-out, so colour is never the only cue")
})
