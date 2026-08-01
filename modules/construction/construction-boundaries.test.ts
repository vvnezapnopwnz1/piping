import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const MODULE_ROOT = "modules/construction"
const APP_ROOT = "app/fabrication"

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

const sources = walk(MODULE_ROOT).filter(
  (path) => path.endsWith(".ts") || path.endsWith(".tsx"),
)

// Plan section 3.15: the construction module never reaches into demo state.
for (const path of sources) {
  const source = readFileSync(path, "utf8")
  assert.equal(
    /from "@\/store\//.test(source),
    false,
    `${path} must not import from store/`,
  )
}

// Domain and application stay free of infrastructure.
for (const path of sources.filter(
  (candidate) => candidate.includes("/domain/") || candidate.includes("/application/"),
)) {
  const source = readFileSync(path, "utf8")
  assert.equal(/@supabase\//.test(source), false, `${path} must not import Supabase`)
  assert.equal(/from "react"/.test(source), false, `${path} must not import React`)
}

// Every fabrication page must branch on the app mode rather than assume demo state.
const RETIRED_STORES = [
  "spools-store",
  "welds-store",
  "qc-release-store",
  "paint-store",
  "laydown-store",
  "pwht-store",
]

for (const path of walk(APP_ROOT).filter((candidate) => candidate.endsWith("page.tsx"))) {
  const source = readFileSync(path, "utf8")
  if (source.includes("redirect(")) continue
  assert.ok(source.includes("useAppMode"), `${path} must branch on the app mode`)
  for (const store of RETIRED_STORES) {
    assert.equal(
      source.includes(store),
      false,
      `${path} must not import ${store} directly; the demo component owns it`,
    )
  }
}

// Plan section 3.4: accepting a revision authorizes a progress carry-over; something has
// to materialize it. Until the workbench calls the command, the seam is dead code.
{
  const workbench = readFileSync("modules/engineering/ui/revision-workbench.tsx", "utf8")
  assert.ok(
    workbench.includes("materializeProgressCopies"),
    "revision-workbench.tsx must materialize progress copies after applying an import",
  )
  assert.ok(
    workbench.includes("affectedEntityIds"),
    "revision-workbench.tsx must materialize the revisions the applied job reports",
  )
}
