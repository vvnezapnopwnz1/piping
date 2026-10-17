import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// PostgREST answers at most 1,000 rows. A loader that reads a whole project (a pilot has 5-15 thousand
// joints) with a plain select returns the first thousand and no error, so a screen shows a part of the
// project as if it were all of it. These read through selectAllRows; a new project-wide list belongs here.
const root = new URL("../../", import.meta.url)
const LOADERS: ReadonlyArray<readonly [string, string]> = [
  ["modules/quality/infrastructure/supabase-quality-repository.ts", "nde_obligations"],
  ["modules/construction/infrastructure/supabase-erection-repository.ts", "spool_erection_readiness"],
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
