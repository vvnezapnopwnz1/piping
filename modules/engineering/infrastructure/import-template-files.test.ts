import assert from "node:assert/strict"
import test from "node:test"

import { buildTableSubmission } from "../application/import-table"
import { parseDelimited } from "../domain/parsers/delimited"
import { parseSpoolgenFile } from "../domain/parsers/spoolgen-parser"
import { SPOOLGEN_FILE_ROLES } from "../domain/spoolgen-file"
import { decodeText } from "./spoolgen-file-reader"
import { buildTemplateCsv, buildTemplateText, templateRowsFor } from "./import-template-files"

// The CSV is the file a Russian Excel writes: UTF-8 with its mark, ';' between cells, CRLF between rows. The reader
// strips the mark in parseDelimited, so the header is matched by name and no mapping is needed.

test("a SpoolGen file is tab separated with the headers first and one example row", () => {
  for (const role of SPOOLGEN_FILE_ROLES) {
    const lines = buildTemplateText(role).trimEnd().split("\n")
    assert.equal(lines.length, 2, role)
    assert.equal(lines[0].split("\t").length, templateRowsFor(role)[0].length, role)
    assert.deepEqual(parseSpoolgenFile(role, buildTemplateText(role)).issues, [], role)
    assert.equal(parseSpoolgenFile(role, buildTemplateText(role)).records.length, 1, role)
  }
})

test("the CSV starts with the byte order mark, uses semicolons and CRLF, and the reader reads it", () => {
  const csv = buildTemplateCsv(templateRowsFor("weld"))
  assert.ok(csv.startsWith("\uFEFFISO_NUMBER;ISO_REVISION;"), csv.slice(0, 40))
  assert.ok(csv.endsWith("\r\n"))
  assert.equal(csv.trimEnd().split("\r\n").length, 2)
  const { text, encoding } = decodeText(new TextEncoder().encode(csv))
  assert.equal(encoding, "utf-8")
  const submission = buildTableSubmission([{ role: "weld", fileName: "weld-template.csv", matrix: parseDelimited(text) }], { kind: "table", columns: {} })
  assert.deepEqual(submission.issues, [])
  assert.deepEqual(submission.missingColumns, {})
  assert.equal(submission.canSubmit, true)
})

test("a cell holding a semicolon or a quote is quoted, so the row keeps its columns", () => {
  const csv = buildTemplateCsv([["a", "b"], ["one; two", 'say "hi"']])
  assert.equal(csv, `\uFEFFa;b\r\n"one; two";"say ""hi"""\r\n`)
  assert.deepEqual(parseDelimited(csv), [["a", "b"], ["one; two", 'say "hi"']])
})
