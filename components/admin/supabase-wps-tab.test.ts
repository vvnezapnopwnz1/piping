import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("./supabase-wps-tab.tsx", import.meta.url), "utf8")

// This card renders on /admin/project-referential, a business-facing screen. Naming the backend
// product in its title leaks an implementation detail into the operator's vocabulary.
test("the Welding Procedures card title carries no backend product name", () => {
  assert.equal(
    /Welding Procedures \(Supabase\)/.test(source),
    false,
    "business-facing labels must not name the backend implementation",
  )
  assert.ok(source.includes("Welding Procedures"), "the card must still be titled Welding Procedures")
})
