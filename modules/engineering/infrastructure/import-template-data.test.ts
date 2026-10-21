import assert from "node:assert/strict"
import test from "node:test"

import { parseSpoolgenMatrix } from "../domain/parsers/spoolgen-parser"
import { SPOOLGEN_CONTRACT } from "../domain/spoolgen-contract"
import { SPOOLGEN_FILE_ROLES, type SpoolgenFileRole } from "../domain/spoolgen-file"
import type { WeldLocation } from "../domain/import-template"
import { templateFieldsFor, templateSampleRow } from "./import-template-data"

// The downloaded file is the thing people compare their own file with, so each assertion here is about a promise the
// screen makes: the same columns the import reads, the canonical headers it matches by name, a sample row it accepts.

const headersOf = (role: SpoolgenFileRole) => templateFieldsFor(role).map((field) => field.header)
const matrixOf = (role: SpoolgenFileRole) => [headersOf(role), templateSampleRow(role)]
const valuesOf = (role: SpoolgenFileRole) => parseSpoolgenMatrix(role, matrixOf(role)).records[0].values

test("a role's template carries every contract column once, in contract order", () => {
  for (const role of SPOOLGEN_FILE_ROLES) {
    const fields = templateFieldsFor(role)
    assert.deepEqual(fields.map((field) => field.key), SPOOLGEN_CONTRACT[role].map((column) => column.key), role)
    for (const field of fields) {
      const column = SPOOLGEN_CONTRACT[role].find((entry) => entry.key === field.key)!
      assert.equal(field.header, column.canonicalHeader, `${role}.${field.key}`)
      assert.equal(field.required, column.required, `${role}.${field.key}`)
    }
    assert.equal(new Set(fields.map((field) => field.header)).size, fields.length, `${role} headers are unique`)
    assert.deepEqual(templateSampleRow(role).filter((value) => value === ""), [], `${role}: every column has an example value`)
  }
})

test("the parser itself reads the header row and the example row with no issue", () => {
  for (const role of SPOOLGEN_FILE_ROLES) {
    const parsed = parseSpoolgenMatrix(role, matrixOf(role))
    assert.deepEqual(parsed.issues, [], role)
    assert.equal(parsed.records.length, 1, role)
  }
})

test("the four files describe one isometric and one spool, so they belong together", () => {
  const values = SPOOLGEN_FILE_ROLES.map(valuesOf)
  assert.deepEqual([...new Set(values.map((entry) => entry.iso_number))], ["ISO-4001"])
  assert.deepEqual([...new Set(values.map((entry) => entry.spool_number))], ["ISO-4001-S1"])
})

test("the place of a weld is one of the three the server stores", () => {
  const fields = templateFieldsFor("weld")
  const index = fields.findIndex((entry) => entry.key === "weld_location")
  const field = fields[index]
  const sample = templateSampleRow("weld")[index]
  assert.equal(field.allowedValues, "weldLocation")
  assert.ok((["shop", "assembly", "field"] as readonly WeldLocation[]).includes(sample as WeldLocation))
})

test("a quantity is a count where it counts, and an amount in the row's own unit elsewhere", () => {
  const unitOf = (role: SpoolgenFileRole, key: string) => templateFieldsFor(role).find((field) => field.key === key)?.unit
  assert.equal(unitOf("weld", "diameter_inch"), "inch")
  assert.equal(unitOf("weld", "thickness_mm"), "mm")
  assert.equal(unitOf("weld", "spool_weight_kg"), "kg")
  assert.equal(unitOf("bolt", "diameter_inch"), "inch")
  assert.equal(unitOf("bolt", "bolt_quantity"), "count")
  assert.equal(unitOf("trace", "ident_code"), null)
  assert.equal(unitOf("supp", "quantity"), "count", "a support count is in pieces")
  assert.equal(unitOf("trace", "quantity"), null, "a material's quantity is an amount, its unit is the row's UNIT column")
})

test("the help sheet's provenance is pinned where it is not the file itself", () => {
  assert.deepEqual(templateFieldsFor("weld").filter((field) => field.source !== "file").map((field) => [field.key, field.source]), [
    ["iso_number", "drawing"], ["revision_number", "drawing"], ["pds_area", "projectCodes"], ["service_class", "projectCodes"], ["weld_type", "projectCodes"],
  ])
  assert.equal(templateFieldsFor("trace").find((field) => field.key === "ident_code")?.source, "file", "a column with no special source falls back to the file itself")
})
