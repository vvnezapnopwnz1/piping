import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("../modules/home/ui/home-executive-overview.tsx", import.meta.url), "utf8")

// Tracking (Track 08) and Reports (Track 11) both closed and shipped before Track 12; neither
// track's own deferred-items file claims the module is unfinished. The `live: false` / `note:
// "Track N"` badges on the landing page are simply stale.
test("Spool Tracking and Reports & Forms are not marked with a stale Track badge", () => {
  assert.equal(
    /title:\s*"Spool Tracking"[\s\S]{0,120}live:\s*false/.test(source),
    false,
    "Spool Tracking is a live, Supabase-backed module (Track 08 closed)",
  )
  assert.equal(
    /title:\s*"Reports & Forms"[\s\S]{0,120}live:\s*false/.test(source),
    false,
    "Reports & Forms is a live, Supabase-backed module (Track 11 closed)",
  )
})

test("the note field survives for the module that still legitimately uses it", () => {
  assert.ok(
    source.includes("ISO workflow and transmittals outstanding"),
    "Spooling's outstanding-work note is a real caveat and must not be swept up in the badge cleanup",
  )
})
