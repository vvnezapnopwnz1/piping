import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("./top-nav.tsx", import.meta.url), "utf8")

// `accessLabels` puts the primary access role first, then every functional role. Joining the whole
// list into the avatar trigger renders e.g. "Project Editor · Erection Contributor · Fabrication
// Contributor · NDE Inspector · QC Engineer · Spooling Team · Tracking Operator" on every screen.
test("the avatar trigger shows only the primary access label, not every functional role", () => {
  assert.equal(
    /topNavDisplay\.accessLabels\.join\(" · "\)/.test(source),
    false,
    "the trigger must not join the full access-labels list",
  )
  assert.ok(
    source.includes("topNavDisplay.accessLabels[0]"),
    "the trigger must show the primary access label",
  )
})

test("the full functional-role list still appears somewhere, inside the dropdown content", () => {
  assert.ok(
    source.includes("topNavDisplay.accessLabels.slice(1)"),
    "the remaining functional roles must move into the dropdown content",
  )
})
