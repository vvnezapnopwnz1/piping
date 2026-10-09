import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { I18N_DONE_PATHS } from "@/i18n/coverage"
import { findUiLiterals } from "@/scripts/i18n/find-ui-literals"

test("the root and projects pages only mount their screens and hold no English", () => {
  for (const path of ["app/page.tsx", "app/projects"]) assert.ok(I18N_DONE_PATHS.includes(path), path)
  assert.deepEqual(findUiLiterals(["app/page.tsx", "app/projects"]), [])
  assert.match(readFileSync(new URL("./page.tsx", import.meta.url), "utf8"), /<HomeExecutiveOverview \/>/)
  assert.match(readFileSync(new URL("./projects/page.tsx", import.meta.url), "utf8"), /<ProjectCatalogScreen \/>/)
})
