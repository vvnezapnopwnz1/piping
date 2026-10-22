import assert from "node:assert/strict"
import test from "node:test"
import type { StagingRow } from "../domain/definition"
import { DEFAULT_PCF_SETTINGS, parseTemplateSettings, type ImportReferences } from "../domain/import-template"
import { buildPcfSubmission } from "./import-pcf"
import type { SpoolgenSubmission } from "./import-spooling"
import { applyCodeChoices, suggestCodesToMap } from "./pcf-unmapped"

const row = (rowNumber: number, kind: string, values: Record<string, string>): StagingRow => ({ rowNumber, rawValues: values, normalizedValues: { entity_type: kind, ...values }, action: "create" })
const submissionOf = (rows: StagingRow[]): SpoolgenSubmission => ({ rows, rowSources: rows.map(() => []), issues: [], summary: { blockerCount: 0, warningCount: 0 }, canSubmit: true })
const references: ImportReferences = { pdsAreas: [], serviceClasses: ["SC-01"], weldTypes: ["BW"] }
const none = { serviceClasses: {}, weldTypes: {} }

test("the weld codes the project does not have, sorted, each once", () => {
  const submission = submissionOf([
    row(1, "weld_joint", { service_class: "CS150", weld_type: "WN" }),
    row(2, "weld_joint", { service_class: "SC-01", weld_type: "BW" }),
    row(3, "weld_joint", { service_class: "CS150", weld_type: "WN" }),
  ])
  assert.deepEqual(suggestCodesToMap(submission, references), { serviceClasses: ["CS150"], weldTypes: ["WN"] })
})

test("only weld rows are read, and an empty value is a missing value, not a code to map", () => {
  const submission = submissionOf([
    row(1, "isometric", { service_class: "ISO-ONLY" }),
    row(2, "weld_joint", { service_class: "", weld_type: "" }),
    row(3, "weld_joint", { service_class: "Z1", weld_type: "SW" }),
    row(4, "weld_joint", { service_class: "A1", weld_type: "FW" }),
  ])
  assert.deepEqual(suggestCodesToMap(submission, references), { serviceClasses: ["A1", "Z1"], weldTypes: ["FW", "SW"] })
})

test("a chosen project code is written into the template's map, and the template it came from is left as it was", () => {
  const before = structuredClone(DEFAULT_PCF_SETTINGS)
  const after = applyCodeChoices(DEFAULT_PCF_SETTINGS, { serviceClasses: { CS150: "SC-01" }, weldTypes: { SW: "SW-1" } })
  assert.deepEqual(after, { ...DEFAULT_PCF_SETTINGS, serviceClassBySpec: { CS150: "SC-01" }, weldTypeByCode: { WN: "BW", SW: "SW-1" } })
  assert.deepEqual(DEFAULT_PCF_SETTINGS, before)
  assert.deepEqual(applyCodeChoices(DEFAULT_PCF_SETTINGS, none), DEFAULT_PCF_SETTINGS)
})

test("a code a template mapping produced is fixed where it comes from, so the welds it covers change too", () => {
  const after = applyCodeChoices(DEFAULT_PCF_SETTINGS, { serviceClasses: {}, weldTypes: { BW: "BUTT" } })
  assert.deepEqual(after.weldTypeByCode, { WN: "BUTT", BW: "BUTT" })
})

test("weld-type keys are written in upper case, the way a template reads back", () => {
  const after = applyCodeChoices({ ...DEFAULT_PCF_SETTINGS, weldTypeByCode: { WN: "bw" } }, { serviceClasses: { cs150: "SC-01" }, weldTypes: { bw: "BUTT" } })
  assert.deepEqual(after.weldTypeByCode, { WN: "BUTT", BW: "BUTT" })
  assert.deepEqual(after.serviceClassBySpec, { cs150: "SC-01" }, "PIPING-SPEC keys stay as written")
  assert.deepEqual(parseTemplateSettings(after), after)
})

test("a code called __proto__ stays a key", () => {
  const after = applyCodeChoices(DEFAULT_PCF_SETTINGS, { serviceClasses: JSON.parse('{"__proto__":"SC-01"}'), weldTypes: {} })
  assert.equal(Object.getPrototypeOf(after.serviceClassBySpec), Object.prototype)
  assert.deepEqual(Object.keys(after.serviceClassBySpec), ["__proto__"])
})

test("after the codes are chosen, the rebuilt upload names only the project's codes", () => {
  const text = [
    "UNITS-BORE MM", "PIPELINE-REFERENCE L-1", "    REVISION 1", "    PIPING-SPEC CS150",
    "PIPE", "    END-POINT 0 0 0 100 BW", "    END-POINT 1000 0 0 100 BW", "    SPOOL-IDENTIFIER S1",
    "WELD", "    END-POINT 1000 0 0 100", "    SKEY WW", "    WELD-TYPE WN", "    REPEAT-WELD-IDENTIFIER 1",
  ].join("\n")
  const sources = [{ fileName: "ISO-1.pcf", text }]
  const project: ImportReferences = { pdsAreas: ["A"], serviceClasses: ["SC-01"], weldTypes: ["BUTT"] }
  const read = buildPcfSubmission(sources, { pdsArea: "A", settings: DEFAULT_PCF_SETTINGS })
  assert.deepEqual(suggestCodesToMap(read, project), { serviceClasses: ["CS150"], weldTypes: ["BW"] })

  const settings = applyCodeChoices(DEFAULT_PCF_SETTINGS, { serviceClasses: { CS150: "SC-01" }, weldTypes: { BW: "BUTT" } })
  const rebuilt = buildPcfSubmission(sources, { pdsArea: "A", settings })
  assert.deepEqual(suggestCodesToMap(rebuilt, project), { serviceClasses: [], weldTypes: [] })
  const weld = rebuilt.rows.find((entry) => entry.normalizedValues.entity_type === "weld_joint")
  assert.equal(weld?.normalizedValues.service_class, "SC-01")
  assert.equal(weld?.normalizedValues.weld_type, "BUTT")
})
