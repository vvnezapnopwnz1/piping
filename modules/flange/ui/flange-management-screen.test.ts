import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { en } from "@/i18n/messages"

const source = readFileSync(new URL("./flange-management-screen.tsx", import.meta.url), "utf8")

assert.match(source, /listFlangeWorklist/)
assert.match(source, /listFlangeHistory/)
// The two record actions and the unconfigured UT keep their words, now in the messages.
assert.match(source, /t\("recordFlangeProgress"\)/)
assert.match(source, /t\("recordCorrection"\)/)
assert.match(en.flange.management.recordFlangeProgress, /Record flange progress/)
assert.match(en.flange.management.recordCorrection, /Record correction/)
assert.match(source, /jointerIds/)
assert.match(source, /t\("notConfigured"\)/)
assert.match(en.flange.columns.notConfigured, /Not configured/)
assert.match(source, /mode === "browse"/)
assert.match(source, /crypto\.randomUUID\(\)/)
