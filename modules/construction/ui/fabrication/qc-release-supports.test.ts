import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Fabricated is derived from material, shop welds and supports (is_fabricated in the spool
// projection), and supports are installed on the QC release step. When that step hid the
// supports card until the spool was Fabricated, a spool with a shop support could never leave
// the shop through the screens. Neither the type checker nor the server can see it.
const source = readFileSync(new URL("./qc-release-screen.tsx", import.meta.url), "utf8")
const blockedPanel = source.slice(source.indexOf('mode === "blocked"'), source.indexOf("<>", source.indexOf('mode === "blocked"')))

test("the supports card is rendered in the blocked panel, not only in the actionable one", () => {
  assert.match(blockedPanel, /renderSupportsCard\(false, true\)/)
})

test("the supports card is never hidden by the evidence filter while the step is blocked", () => {
  assert.match(source, /renderSupportsCard = \(hidden: boolean, withDate/)
  assert.doesNotMatch(blockedPanel, /renderSupportsCard\(true\)/)
})
