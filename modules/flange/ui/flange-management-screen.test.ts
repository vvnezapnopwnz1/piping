import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("./flange-management-screen.tsx", import.meta.url), "utf8")

assert.match(source, /listFlangeWorklist/)
assert.match(source, /listFlangeHistory/)
assert.match(source, /Record flange progress/)
assert.match(source, /Record correction/)
assert.match(source, /jointerIds/)
assert.match(source, /UT.*not configured|Not configured/)
assert.match(source, /mode === "browse"/)
assert.match(source, /crypto\.randomUUID\(\)/)
