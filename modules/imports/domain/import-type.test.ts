// modules/imports/domain/import-type.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import { parseImportType } from "./import-type"

test("an import type in the address is accepted only when it exists", () => {
  assert.equal(parseImportType("nde_matrix"), "nde_matrix")
  for (const raw of [null, "", "nde", "toString"]) assert.equal(parseImportType(raw), null, String(raw))
})

