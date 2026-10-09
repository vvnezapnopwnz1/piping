import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import { en } from "@/i18n/messages"

const source = readFileSync(new URL("./flange-management-screen.tsx", import.meta.url), "utf8")
const drawerSource = readFileSync("components/ui/record-drawer.tsx", "utf8")

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

assert.match(source, /import \{ RecordDrawer \} from "@\/components\/ui\/record-drawer"/)
assert.match(source, /<RecordDrawer[\s\S]*recordKind="flange"[\s\S]*onClose=\{\(\) => setSelectedId\(null\)\}/)
assert.match(source, /data-operation-scroll/)
assert.match(drawerSource, /recordKind: "spool" \| "test-pack" \| "flange"/)
assert.match(drawerSource, /recordKind === "flange"[\s\S]*data-flange-drawer/)

// The read-only Flange directory opens a drawer with separate details and history tabs.
assert.match(source, /import \{ Tabs, TabsContent, TabsList, TabsTrigger \} from "@\/components\/ui\/tabs"/)
assert.match(source, /mode === "browse" \? <FlangeBrowseTabs/)
assert.match(source, /<TabsTrigger value="details">\{t\("details"\)\}<\/TabsTrigger>/)
assert.match(source, /<TabsTrigger value="history">\{t\("history"\)\}<\/TabsTrigger>/)
assert.match(source, /<TabsContent value="details">[\s\S]*diameterInch/)
assert.match(en.flange.management.details, /Flange/)
