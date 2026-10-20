import assert from "node:assert/strict"
import { BUILT_IN_TEMPLATES, DEFAULT_PCF_SETTINGS, IMPORT_SOURCE_IDS, isImportSourceId, parseTemplateSettings, templateKindOf } from "./import-template"

// A table template keeps the column names a project's files use, per file role
assert.deepEqual(parseTemplateSettings({ kind: "table", columns: { weld: { weld_number: "Шов" } } }), { kind: "table", columns: { weld: { weld_number: "Шов" } } })
assert.deepEqual(parseTemplateSettings({ kind: "table", columns: {} }), { kind: "table", columns: {} })
assert.deepEqual(parseTemplateSettings({ kind: "table" }), { kind: "table", columns: {} }, "a table template without columns has none mapped yet")
// The shape is checked strictly: a role the import does not know, a non-object role, a non-string header
assert.equal(parseTemplateSettings({ kind: "table", columns: { pcf: { weld_number: "Шов" } } }), null)
assert.equal(parseTemplateSettings({ kind: "table", columns: { weld: ["Шов"] } }), null)
assert.equal(parseTemplateSettings({ kind: "table", columns: { weld: { weld_number: 7 } } }), null)
assert.equal(parseTemplateSettings({ kind: "table", columns: "weld" }), null)

// A PCF template fills what it omits from the defaults
assert.deepEqual(parseTemplateSettings({ kind: "pcf" }), DEFAULT_PCF_SETTINGS)
const filled = parseTemplateSettings({ kind: "pcf", isoNumberFrom: "pipelineReference" })
assert.deepEqual(filled, { ...DEFAULT_PCF_SETTINGS, isoNumberFrom: "pipelineReference" })
// ...with copies, so editing a parsed template never edits the defaults
assert.ok(filled?.kind === "pcf")
assert.notEqual(filled.weldLocationBySkey, DEFAULT_PCF_SETTINGS.weldLocationBySkey)
filled.weldLocationBySkey.ZZ = "field"
assert.equal(DEFAULT_PCF_SETTINGS.weldLocationBySkey.ZZ, undefined)
// A map the template gives replaces the default map; it is not merged with it
assert.deepEqual(parseTemplateSettings({ kind: "pcf", weldLocationBySkey: { XX: "assembly" } }), { ...DEFAULT_PCF_SETTINGS, weldLocationBySkey: { XX: "assembly" } })
assert.deepEqual(parseTemplateSettings({ kind: "pcf", defaultRevision: "0" }), { ...DEFAULT_PCF_SETTINGS, defaultRevision: "0" })
assert.deepEqual(parseTemplateSettings({ kind: "pcf", defaultRevision: null }), DEFAULT_PCF_SETTINGS)
assert.deepEqual(parseTemplateSettings({ kind: "pcf", serviceClassBySpec: { cs150: "SC-A" } }), { ...DEFAULT_PCF_SETTINGS, serviceClassBySpec: { cs150: "SC-A" } })

// R16: the weld derivation looks SKEY and weld type up in upper case, so those keys are upper-cased here; PIPING-SPEC keys stay as written
assert.deepEqual(
  parseTemplateSettings({ kind: "pcf", weldLocationBySkey: { ww: "shop", Ws: "field" }, weldTypeByCode: { wn: "BW" }, serviceClassBySpec: { cs150: "SC-A" } }),
  { ...DEFAULT_PCF_SETTINGS, weldLocationBySkey: { WW: "shop", WS: "field" }, weldTypeByCode: { WN: "BW" }, serviceClassBySpec: { cs150: "SC-A" } })

// A PCF template with a value of the wrong type or outside the allowed words is not a template
assert.equal(parseTemplateSettings({ kind: "pcf", weldLocationBySkey: { WW: "yard" } }), null)
assert.equal(parseTemplateSettings({ kind: "pcf", weldLocationBySkey: { WW: 1 } }), null)
assert.equal(parseTemplateSettings({ kind: "pcf", weldLocationBySkey: ["shop"] }), null)
assert.equal(parseTemplateSettings({ kind: "pcf", weldTypeByCode: { WN: 3 } }), null)
assert.equal(parseTemplateSettings({ kind: "pcf", serviceClassBySpec: "CS150" }), null)
assert.equal(parseTemplateSettings({ kind: "pcf", isoNumberFrom: "folder" }), null)
assert.equal(parseTemplateSettings({ kind: "pcf", defaultRevision: 2 }), null)

// Anything else is not a template
assert.equal(parseTemplateSettings({ kind: "x" }), null)
assert.equal(parseTemplateSettings({}), null)
assert.equal(parseTemplateSettings(null), null)
assert.equal(parseTemplateSettings(undefined), null)
assert.equal(parseTemplateSettings("pcf"), null)
assert.equal(parseTemplateSettings([]), null)

// A key called __proto__ stays a key: it is never a way to reach the prototype
const polluted = parseTemplateSettings(JSON.parse('{"kind":"pcf","serviceClassBySpec":{"__proto__":"SC-X"}}'))
assert.ok(polluted?.kind === "pcf")
assert.equal(Object.getPrototypeOf(polluted.serviceClassBySpec), Object.prototype)
assert.equal(Object.keys(polluted.serviceClassBySpec).join(), "__proto__")

// One built-in template per source, in the order the picker shows them
assert.deepEqual(BUILT_IN_TEMPLATES.map((template) => template.source), ["aveva", "hexagon", "plant3d", "table", "spoolgen"])
assert.deepEqual([...IMPORT_SOURCE_IDS], BUILT_IN_TEMPLATES.map((template) => template.source))
assert.equal(isImportSourceId("plant3d"), true)
assert.equal(isImportSourceId("pcf"), false)
for (const template of BUILT_IN_TEMPLATES) {
  assert.equal(template.id, null, "a built-in template has no row")
  assert.ok(template.name.trim().length > 0)
  assert.deepEqual(parseTemplateSettings(template.settings), template.settings, `${template.source} settings are a valid template`)
  assert.equal(template.settings.kind, templateKindOf(template.source))
}
assert.deepEqual(BUILT_IN_TEMPLATES.filter((template) => template.settings.kind === "pcf").map((template) => template.source), ["aveva", "hexagon", "plant3d"])
assert.deepEqual(BUILT_IN_TEMPLATES.find((template) => template.source === "spoolgen")?.settings, { kind: "table", columns: {} })
assert.deepEqual(BUILT_IN_TEMPLATES.find((template) => template.source === "table")?.settings, { kind: "table", columns: {} })
// The PCF presets start from the defaults but own their maps
const [aveva, hexagon] = BUILT_IN_TEMPLATES
assert.deepEqual(aveva.settings, DEFAULT_PCF_SETTINGS)
assert.ok(aveva.settings.kind === "pcf" && hexagon.settings.kind === "pcf")
assert.notEqual(aveva.settings.weldLocationBySkey, DEFAULT_PCF_SETTINGS.weldLocationBySkey)
assert.notEqual(aveva.settings.weldLocationBySkey, hexagon.settings.weldLocationBySkey)

// The kind of settings a source takes
assert.equal(templateKindOf("aveva"), "pcf")
assert.equal(templateKindOf("hexagon"), "pcf")
assert.equal(templateKindOf("plant3d"), "pcf")
assert.equal(templateKindOf("table"), "table")
assert.equal(templateKindOf("spoolgen"), "table")
