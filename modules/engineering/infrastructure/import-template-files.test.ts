import assert from "node:assert/strict"
import test from "node:test"

import { buildTableSubmission } from "../application/import-table"
import { parseDelimited } from "../domain/parsers/delimited"
import { parseSpoolgenFile } from "../domain/parsers/spoolgen-parser"
import { SPOOLGEN_FILE_ROLES, SPOOLGEN_REQUIRED_ROLES } from "../domain/spoolgen-file"
import { decodeText } from "./spoolgen-file-reader"
import { CSV_TEMPLATE_ROLE, buildTemplateCsv, buildTemplateText, templateRowsFor } from "./import-template-files"

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

// The CSV is the file a Russian Excel writes: UTF-8 with its mark, ';' between cells, CRLF between rows. The reader
// strips the mark in parseDelimited, so the header is matched by name and no mapping is needed.
test("the CSV starts with the byte order mark, uses semicolons and CRLF, and the reader reads it", () => {
  assert.equal(CSV_TEMPLATE_ROLE, SPOOLGEN_REQUIRED_ROLES[0], "the CSV holds the role an upload requires")
  const csv = buildTemplateCsv(templateRowsFor(CSV_TEMPLATE_ROLE))
  assert.ok(csv.startsWith("\uFEFFISO_NUMBER;ISO_REVISION;"), csv.slice(0, 40))
  assert.ok(csv.endsWith("\r\n"))
  const { text, encoding } = decodeText(new TextEncoder().encode(csv))
  assert.equal(encoding, "utf-8")
  assert.equal(parseDelimited(text).length, 2)
  const submission = buildTableSubmission([{ role: CSV_TEMPLATE_ROLE, fileName: "weld-template.csv", matrix: parseDelimited(text) }], { kind: "table", columns: {} })
  assert.deepEqual(submission.issues, [])
  assert.deepEqual(submission.missingColumns, {})
  assert.equal(submission.canSubmit, true)
  assert.deepEqual(submission.rows.map((row) => row.normalizedValues.entity_type), ["isometric", "spool", "weld_joint"], "the one weld row becomes an isometric, a spool and a weld")
})

test("a cell holding a semicolon, a quote or a line break is quoted, so the row keeps its columns", () => {
  const csv = buildTemplateCsv([["a", "b"], ["one; two", 'say "hi"']])
  assert.equal(csv, `\uFEFFa;b\r\n"one; two";"say ""hi"""\r\n`)
  assert.deepEqual(parseDelimited(csv), [["a", "b"], ["one; two", 'say "hi"']])
  assert.deepEqual(parseDelimited(buildTemplateCsv([["a", "b"], ["x\r\ny", ""]])), [["a", "b"], ["x\r\ny", ""]], "a line break inside a cell survives")
  assert.equal(buildTemplateCsv([["n"], [0]]), "\uFEFFn\r\n0\r\n", "a zero stays a cell, it is not dropped")
})
