import assert from "node:assert/strict"
import test from "node:test"

import { I18N_DONE_PATHS, RU_COMPLETE_NAMESPACES } from "@/i18n/coverage"
import { en, ru } from "@/i18n/messages"
import { findUiLiterals } from "@/scripts/i18n/find-ui-literals"

const paths = ["modules/projects/ui", "modules/projects/domain", "app/projects"]

test("projects are in Russian coverage and carry no hard-coded English", () => {
  for (const path of paths) assert.ok(I18N_DONE_PATHS.includes(path), path)
  assert.ok(RU_COMPLETE_NAMESPACES.includes("projects"))
  assert.deepEqual(findUiLiterals(paths), [])
})

test("the projects namespace is registered in both languages", () => {
  assert.ok(Object.keys(en.projects).length > 0)
  assert.ok(Object.keys(ru.projects ?? {}).length > 0)
})
