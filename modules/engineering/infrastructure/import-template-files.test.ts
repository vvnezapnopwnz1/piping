import assert from "node:assert/strict"
import test from "node:test"

import { parseSpoolgenFile } from "../domain/parsers/spoolgen-parser"
import { SPOOLGEN_FILE_ROLES } from "../domain/spoolgen-file"
import { buildTemplateText, templateRowsFor } from "./import-template-files"

test("a SpoolGen file is tab separated with the headers first and one example row", () => {
  // SpoolGen writes tabs, so the file a person fills keeps them and the reader detects that delimiter.
  for (const role of SPOOLGEN_FILE_ROLES) {
    const text = buildTemplateText(role)
    assert.ok(text.endsWith("\n") && !text.endsWith("\n\n"), `${role} ends with one line break`)
    const lines = text.trimEnd().split("\n")
    assert.equal(lines.length, 2, role)
    assert.equal(lines[0].split("\t").length, templateRowsFor(role)[0].length, role)
    const parsed = parseSpoolgenFile(role, text)
    assert.deepEqual(parsed.issues, [], role)
    assert.equal(parsed.records.length, 1, role)
  }
})
