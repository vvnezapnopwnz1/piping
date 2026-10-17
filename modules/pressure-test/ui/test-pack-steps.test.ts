import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Layout contracts that no type check sees: the open step's header must stay under the pack header while the
// content scrolls (owner request 2026-10-17), and only the panel scrolls. A sticky element stops working under
// an overflow-hidden ancestor, so none may sit between them.
const steps = readFileSync(new URL("./test-pack-steps.tsx", import.meta.url), "utf8")
const screen = readFileSync(new URL("./test-packs-screen.tsx", import.meta.url), "utf8")

test("the open step header is sticky below the pack header", () => {
  assert.match(steps, /PACK_HEADER_HEIGHT_PX\s*=\s*76/)
  assert.match(steps, /sticky/)
  assert.match(steps, /top-\[76px\]/)
})
test("the pack header is sticky and has the height the step header offsets by", () => {
  assert.match(screen, /sticky top-0/)
  assert.match(screen, /h-\[76px\]/)
})
test("the right panel scrolls and no ancestor of the steps hides overflow", () => {
  assert.match(screen, /overflow-y-auto/)
  assert.doesNotMatch(screen, /overflow-hidden/)
  assert.doesNotMatch(steps, /overflow-hidden/)
})
