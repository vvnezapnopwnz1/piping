import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const MODULE_ROOT = "modules/construction"
const APP_ROOTS = ["app/fabrication", "app/erection"]

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

const sources = walk(MODULE_ROOT).filter(
  (path) => path.endsWith(".ts") || path.endsWith(".tsx"),
)

// Plan section 3.15: the construction module never reaches into demo state. `store/` is gone
// from this branch, so this now guards against reintroducing it rather than against a live
// parallel implementation.
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

// Construction routes read the database and nothing else.
//
// This assertion used to require the opposite: every fabrication page had to call `useAppMode`,
// because a demo implementation sat beside the Supabase one and the page chose between them.
// The demo is gone, so the invariant is now that no construction route holds client-side
// project state at all — no `store/`, and no mode switch to bring one back.
for (const root of APP_ROOTS) {
  for (const path of walk(root).filter((candidate) => candidate.endsWith("page.tsx"))) {
    const source = readFileSync(path, "utf8")
    if (source.includes("redirect(")) continue

    assert.equal(
      /from "@\/store\//.test(source),
      false,
      `${path} must not import from store/`,
    )
    assert.equal(
      /useAppMode|app-mode/.test(source),
      false,
      `${path} must not reintroduce an app mode switch`,
    )
    assert.ok(
      /@\/modules\//.test(source),
      `${path} must render a module screen rather than inline its own reads`,
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
