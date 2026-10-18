import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// PostgREST answers at most 1,000 rows. A loader that reads a whole project (a pilot has 5-15 thousand
// joints) with a plain select returns the first thousand and no error, so a screen shows a part of the
// project as if it were all of it. These read through selectAllRows; a new project-wide list belongs here.
const root = new URL("../../", import.meta.url)
const LOADERS: ReadonlyArray<readonly [string, string]> = [
  ["modules/quality/infrastructure/supabase-quality-repository.ts", "nde_obligations"],
  ["modules/flange/infrastructure/supabase-flange-repository.ts", "flange_joint_worklist"],
  ["modules/engineering/infrastructure/supabase-engineering-repository.ts", "isometrics"],
  ["modules/pressure-test/infrastructure/supabase-pressure-test-repository.ts", "isometric_readiness"],
  ["modules/pressure-test/infrastructure/test-pack-rows.ts", "test_pack_workflow"],
]

for (const [file, table] of LOADERS) {
  test(`${table} is read past the 1,000-row cap`, () => {
    const source = readFileSync(new URL(file, root), "utf8")
    assert.match(source, new RegExp(`selectAllRows\\([^]*?from\\("${table}"\\)[^]*?\\.range\\(from, to\\)`))
  })
}

// A file with several loaders cannot be pinned by table: one selectAllRows near the top would satisfy the
// pattern above for a plain select further down. These are pinned by function, so each body must page.
// Lists shown through the keyset hook (fabrication and erection spool pages) carry their own total and are
// not here; a loader read for one test pack, one request or one object is not project-wide.
const quality = "modules/quality/infrastructure/supabase-quality-repository.ts"
const pressure = "modules/pressure-test/infrastructure/supabase-pressure-test-repository.ts"
const FUNCTION_LOADERS: ReadonlyArray<readonly [string, string]> = [
  [quality, "loadNdeBatches"],
  [quality, "loadNdeBatchObligationCounts"],
  [quality, "loadNdeKpis"],
  [pressure, "listProjectIsometricNumbers"],
  [pressure, "listTestPackReadiness"],
  [pressure, "listTestPackReleaseBacklog"],
  [pressure, "listLineCheckWorklist"],
  [pressure, "listItemClearanceWorklist"],
  [pressure, "listBlindingWorklist"],
  [pressure, "listTestingPrecommWorklist"],
  [pressure, "listReinstatementWorklist"],
  ["modules/flange/infrastructure/supabase-flange-repository.ts", "listFlangeHistory"],
  ["modules/tracking/infrastructure/supabase-tracking-repository.ts", "loadRows"],
  ["modules/home/infrastructure/supabase-home-overview-repository.ts", "loadHomeTestPackSummary"],
]

function functionBody(source: string, name: string): string {
  const start = source.search(new RegExp(`function ${name}\\(`))
  assert.notEqual(start, -1, `${name} is not in the file`)
  const rest = source.slice(start + 1)
  const next = rest.search(/\n(?:export )?(?:async )?function /)
  return next === -1 ? rest : rest.slice(0, next)
}

for (const [file, name] of FUNCTION_LOADERS) {
  test(`${name} pages past the 1,000-row cap`, () => {
    const body = functionBody(readFileSync(new URL(file, root), "utf8"), name)
    assert.match(body, /selectAllRows(<[^>]*>)?\(/)
    assert.match(body, /\.range\(from, to\)/)
  })
}
