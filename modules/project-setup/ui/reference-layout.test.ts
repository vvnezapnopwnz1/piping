// modules/project-setup/ui/reference-layout.test.ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { REFERENCE_GROUPS } from "./reference-catalog"

const FILES = {
  general: "modules/project-setup/ui/general-references.tsx",
  welding: "modules/project-setup/ui/welding-references.tsx",
  testpack: "modules/project-setup/ui/testpack-references.tsx",
  spooling: "modules/project-setup/ui/spooling-references.tsx",
} as const

test("the project references page has no tabs inside tabs", () => {
  for (const path of [...Object.values(FILES), "modules/project-setup/ui/project-referential-screen.tsx"]) {
    const source = readFileSync(path, "utf8")
    assert.doesNotMatch(source, /<Tabs[\s>]|TabsList|TabsTrigger|TabsContent/, path)
  }
})

test("every reference of a group is drawn by that group's component", () => {
  for (const group of REFERENCE_GROUPS) {
    const source = readFileSync(FILES[group.id], "utf8")
    for (const key of group.keys) {
      assert.match(source, new RegExp(`reference === "${key}"`), `${FILES[group.id]} does not draw ${key}`)
    }
  }
})
