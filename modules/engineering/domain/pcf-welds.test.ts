import assert from "node:assert/strict"
import { DEFAULT_PCF_SETTINGS, type PcfTemplateSettings } from "./import-template"
import { parsePcf } from "./parsers/pcf"
import { boreToInch, pcfToWeldRecords } from "./pcf-welds"
import { spoolgenIssue } from "./spoolgen-issue"

// DN in millimetres maps to the nominal size in inches by table, never by dividing by 25.4
assert.equal(boreToInch(100, "MM"), 4); assert.equal(boreToInch(15, "MM"), 0.5); assert.equal(boreToInch(65, "MM"), 2.5)
assert.equal(boreToInch(96, "INCH-SIXTEENTH"), 6); assert.equal(boreToInch(4, "INCH"), 4); assert.equal(boreToInch(101, "MM"), null)
assert.equal(boreToInch(6, "MM"), 0.125); assert.equal(boreToInch(1200, "MM"), 48)

// The excerpt the PCF reader is tested on: a weld at line 12 on the end of a pipe
const lines = [
  "ISOGEN-FILES ISOGEN.FLS", "UNITS-BORE MM", "UNITS-CO-ORDS MM",
  "PIPELINE-REFERENCE 100-P-1001", "    REVISION 2", "    PIPING-SPEC CS150",
  "PIPE", "    COMPONENT-IDENTIFIER 1", "    END-POINT 0.0000 0.0000 0.0000 100 BW", "    END-POINT 2500.0000 0.0000 0.0000 100 BW", "    SPOOL-IDENTIFIER 100-P-1001-S01",
  "WELD", "    COMPONENT-IDENTIFIER 2", "    MASTER-COMPONENT-IDENTIFIER 1", "    END-POINT 2500.0000 0.0000 0.0000 100", "    END-POINT 2500.0000 0.0000 0.0000 100", "    SKEY WW", "    REPEAT-WELD-IDENTIFIER 5",
  "MATERIALS", "MATERIAL-IDENTIFIER 1", "    ITEM-CODE PA5BSTD", "    DESCRIPTION PIPE, CS API 5L SML, GRD B, STD WT",
]
const sample = lines.join("\n")
// The sample without some lines, or with one line replaced (the replacement may add lines after it)
const without = (...drop: string[]) => lines.filter((line) => !drop.includes(line.trim())).join("\n")
const replaced = (from: string, to: string) => lines.map((line) => (line.trim() === from ? line.replace(from, to) : line)).join("\n")
const read = (text: string, settings: Partial<PcfTemplateSettings> = {}, fileName = "ISO-1001.pcf") =>
  pcfToWeldRecords(parsePcf(text), fileName, { pdsArea: "PDS-A", settings: { ...DEFAULT_PCF_SETTINGS, ...settings } })
const at = (code: Parameters<typeof spoolgenIssue>[0], row: number | null, column: string | null, severity: "blocker" | "warning" = "blocker") =>
  spoolgenIssue(code, row, column, { fileName: "ISO-1001.pcf", severity, role: "weld" })

const { records, issues } = pcfToWeldRecords(parsePcf(sample), "ISO-1001.pcf", { pdsArea: "PDS-A", settings: DEFAULT_PCF_SETTINGS })
assert.deepEqual(records[0].values, { iso_number: "ISO-1001", revision_number: "2", pds_area: "PDS-A", service_class: "CS150", line_number: "100-P-1001", sheet_number: "", spool_number: "100-P-1001-S01", spool_weight_kg: "", material_class: "", weld_number: "ISO-1001-5", weld_type: "BW", weld_location: "shop", diameter_inch: "4", thickness_mm: "" })
assert.equal(records[0].lineNumber, 12); assert.equal(records[0].fileName, "ISO-1001.pcf"); assert.equal(issues.length, 0)
assert.equal(records[0].role, "weld"); assert.equal(records.length, 1)

// No SPOOL-IDENTIFIER anywhere in the file: one spool named after the file, and a warning
const noSpool = read(without("SPOOL-IDENTIFIER 100-P-1001-S01"))
assert.equal(noSpool.records[0].values.spool_number, "ISO-1001")
assert.deepEqual(noSpool.issues, [at("PCF_SPOOL_FROM_FILE_NAME", null, "spool_number", "warning")])

// A weld with no REPEAT-WELD-IDENTIFIER is an error at its line; its number is never invented
const noNumber = read(without("REPEAT-WELD-IDENTIFIER 5"))
assert.deepEqual(noNumber.records, [])
assert.deepEqual(noNumber.issues, [at("MISSING_VALUE", 12, "weld_number")])

// The revision comes from the pipeline, else the template's default, else it is missing
assert.equal(read(without("REVISION 2"), { defaultRevision: "0" }).records[0].values.revision_number, "0")
assert.deepEqual(read(without("REVISION 2")).issues, [at("MISSING_VALUE", 11, "revision_number")])

// The weld type on the weld wins; the template maps a PIPING-SPEC to the project's class
assert.equal(read(replaced("SKEY WW", "SKEY WW\n    WELD-TYPE SW")).records[0].values.weld_type, "SW")
assert.equal(read(sample, { serviceClassBySpec: { CS150: "SC-01" } }).records[0].values.service_class, "SC-01")

// The location comes from the weld's SKEY, else its CATEGORY, else it is missing
assert.equal(read(replaced("SKEY WW", "SKEY WS")).records[0].values.weld_location, "field")
assert.equal(read(replaced("SKEY WW", "SKEY XX\n    CATEGORY ERECTION")).records[0].values.weld_location, "field")
assert.equal(read(without("SKEY WW").replace("REPEAT-WELD-IDENTIFIER 5", "REPEAT-WELD-IDENTIFIER 5\n    CATEGORY FABRICATION")).records[0].values.weld_location, "shop")
assert.deepEqual(read(replaced("SKEY WW", "SKEY XX")).issues, [at("MISSING_VALUE", 12, "weld_location")])
assert.deepEqual(read(without("SKEY WW")).issues, [at("MISSING_VALUE", 12, "weld_location")])

// File-level errors: a bore unit PCF does not define, a file with no WELD block
assert.deepEqual(read(replaced("UNITS-BORE MM", "UNITS-BORE FEET")), { records: [], issues: [at("PCF_UNKNOWN_UNITS", null, null)] })
assert.deepEqual(read(lines.slice(0, 11).join("\n")), { records: [], issues: [at("PCF_NO_WELDS", null, null)] })

// The template may take the isometric number from the pipeline instead of the file name
assert.equal(read(sample, { isoNumberFrom: "pipelineReference" }).records[0].values.iso_number, "100-P-1001")
assert.equal(read(sample, {}, "A.B.pcf").records[0].values.iso_number, "A.B")

// A bore that is not a DN in the table is an error on the weld line; the row stays, with no diameter
const oddBore = read(sample.replaceAll("2500.0000 0.0000 0.0000 100", "2500.0000 0.0000 0.0000 101"))
assert.equal(oddBore.records[0].values.diameter_inch, "")
assert.deepEqual(oddBore.issues, [at("PCF_BORE_UNKNOWN", 12, "diameter_inch")])
// A weld with no bore takes the bore of its part's end at the weld; with none anywhere the diameter is missing
assert.equal(read(replaced("END-POINT 2500.0000 0.0000 0.0000 100", "END-POINT 2500.0000 0.0000 0.0000")).records[0].values.diameter_inch, "4")
const noBore = ["UNITS-BORE MM", "PIPELINE-REFERENCE L-1", "    REVISION 0", "    PIPING-SPEC CS150", "PIPE", "    END-POINT 0 0 0", "    END-POINT 100 0 0", "    SPOOL-IDENTIFIER S-1", "WELD", "    END-POINT 100 0 0", "    SKEY WW", "    WELD-TYPE BW", "    REPEAT-WELD-IDENTIFIER 1"]
assert.deepEqual(read(noBore.join("\n")).issues, [at("MISSING_VALUE", 9, "diameter_inch")])
// Bores in inches pass through
assert.equal(read(replaced("UNITS-BORE MM", "UNITS-BORE INCH").replace(/ 100( BW)?$/gm, " 4$1")).records[0].values.diameter_inch, "4")

// Without a master the weld's part is the nearest part before it (a block with no END-POINT is not a part), else after it.
// Type from the part's end at the weld, else from the end of the part's SKEY, through the template's code map.
// Spool from the weld, its part, the nearest component before that has one, else after. Spec from the weld, its part, its pipeline.
const parts = parsePcf([
  "UNITS-BORE MM",
  "PIPELINE-REFERENCE L-1", "    REVISION 0", "    PIPING-SPEC CS150",
  "WELD", "    END-POINT 0 0 0 50", "    SKEY WS", "    REPEAT-WELD-IDENTIFIER F1",
  "ELBOW", "    END-POINT 0 0 0 50 SW", "    END-POINT 100 0 0 50 BW", "    SKEY ELSW", "    SPOOL-IDENTIFIER S-1", "    PIPING-SPEC AS1",
  "FLANGE", "    END-POINT 100 0 0 150", "    END-POINT 200 0 0 150 FL", "    SKEY FLWN",
  "MESSAGE-SQUARE", "    CO-ORDS 150 0 0", "    TEXT LABEL",
  "WELD", "    END-POINT 100 0 0 150", "    SKEY WW", "    REPEAT-WELD-IDENTIFIER 2", "    SPOOL-IDENTIFIER S-9",
  "PIPELINE-REFERENCE L-2", "    REVISION 3",
  "PIPE", "    END-POINT 900 0 0 80 SW", "    END-POINT 990 0 0 80 SW", "    SPOOL-IDENTIFIER S-2",
  "WELD", "    END-POINT 990 0 0 80", "    SKEY WW", "    REPEAT-WELD-IDENTIFIER 3", "    PIPING-SPEC SS1",
].join("\n"))
const derived = pcfToWeldRecords(parts, "ISO-9.pcf", { pdsArea: "PDS-A", settings: DEFAULT_PCF_SETTINGS })
assert.deepEqual(derived.issues, [])
const pick = (keys: string[]) => derived.records.map((record) => keys.map((key) => record.values[key]))
assert.deepEqual(pick(["weld_number", "weld_type", "spool_number", "service_class", "line_number", "revision_number", "weld_location", "diameter_inch"]), [
  ["ISO-9-F1", "SW", "S-1", "AS1", "L-1", "0", "field", "2"],
  ["ISO-9-2", "BW", "S-9", "CS150", "L-1", "0", "shop", "6"],
  ["ISO-9-3", "SW", "S-2", "SS1", "L-2", "3", "shop", "3"],
])
assert.deepEqual(derived.records.map((record) => record.lineNumber), [5, 22, 33])
// The master component wins over the neighbour, and a part with no SPOOL-IDENTIFIER hands over to the nearest one before it
const master = pcfToWeldRecords(parsePcf([
  "UNITS-BORE MM", "PIPELINE-REFERENCE L-1", "    REVISION 0", "    PIPING-SPEC CS150",
  "PIPE", "    COMPONENT-IDENTIFIER 10", "    END-POINT 0 0 0 50 SW", "    END-POINT 100 0 0 50 SW", "    SPOOL-IDENTIFIER S-1",
  "TEE", "    COMPONENT-IDENTIFIER 11", "    END-POINT 100 0 0 50 BW", "    END-POINT 200 0 0 50 BW",
  "WELD", "    MASTER-COMPONENT-IDENTIFIER 10", "    END-POINT 100 0 0 50", "    SKEY WW", "    REPEAT-WELD-IDENTIFIER 1",
  "WELD", "    MASTER-COMPONENT-IDENTIFIER 11", "    END-POINT 200 0 0 50", "    SKEY WW", "    REPEAT-WELD-IDENTIFIER 2",
].join("\n")), "ISO-9.pcf", { pdsArea: "PDS-A", settings: { ...DEFAULT_PCF_SETTINGS, weldTypeByCode: { BW: "BW-P", SW: "SW-P" } } })
assert.deepEqual(master.records.map((record) => [record.values.weld_type, record.values.spool_number]), [["SW-P", "S-1"], ["BW-P", "S-1"]])

// A weld looks only inside its own pipeline: a tie-in weld that opens L-2 borrows nothing from L-1, it takes L-2's values or misses them
const tieIn = read([
  "UNITS-BORE MM",
  "PIPELINE-REFERENCE L-1", "    REVISION 1", "    PIPING-SPEC CS150",
  "PIPE", "    END-POINT 0 0 0 100 BW", "    END-POINT 1000 0 0 100 BW", "    SPOOL-IDENTIFIER L1-S1",
  "PIPELINE-REFERENCE L-2", "    REVISION 1", "    PIPING-SPEC SS300",
  "WELD", "    END-POINT 1000 0 0 100", "    SKEY WS", "    REPEAT-WELD-IDENTIFIER T1",
].join("\n"), { isoNumberFrom: "pipelineReference" })
assert.deepEqual(["iso_number", "line_number", "spool_number", "service_class", "weld_type", "diameter_inch"].map((key) => tieIn.records[0].values[key]), ["L-2", "L-2", "", "SS300", "", "4"])
assert.deepEqual(tieIn.issues, [at("MISSING_VALUE", 12, "spool_number"), at("MISSING_VALUE", 12, "weld_type")])
// Component identifiers may restart in each pipeline: the master is found in the weld's own pipeline
const restarted = read([
  "UNITS-BORE MM",
  "PIPELINE-REFERENCE L-1", "    REVISION 0", "    PIPING-SPEC CS150",
  "PIPE", "    COMPONENT-IDENTIFIER 1", "    END-POINT 0 0 0 50 SW", "    END-POINT 100 0 0 50 SW", "    SPOOL-IDENTIFIER S-1",
  "PIPELINE-REFERENCE L-2", "    REVISION 0", "    PIPING-SPEC CS150",
  "ELBOW", "    COMPONENT-IDENTIFIER 2", "    END-POINT 500 0 0 80 BW", "    END-POINT 600 0 0 80 BW", "    SPOOL-IDENTIFIER S-2",
  "PIPE", "    COMPONENT-IDENTIFIER 1", "    END-POINT 600 0 0 80 BW", "    END-POINT 900 0 0 80 BW",
  "WELD", "    MASTER-COMPONENT-IDENTIFIER 1", "    END-POINT 600 0 0", "    SKEY WW", "    REPEAT-WELD-IDENTIFIER 7",
].join("\n"))
assert.deepEqual(restarted.issues, [])
assert.deepEqual(["weld_type", "diameter_inch", "spool_number", "line_number"].map((key) => restarted.records[0].values[key]), ["BW", "3", "S-2", "L-2"])

// A weld with no bore takes the bore of its part's end at the weld; a part whose ends differ never lends its first end
const reducer = read([
  "UNITS-BORE MM", "PIPELINE-REFERENCE L-1", "    REVISION 0", "    PIPING-SPEC CS150",
  "REDUCER-CONCENTRIC", "    END-POINT 0 0 0 100 BW", "    END-POINT 200 0 0 50 BW", "    SKEY RCBW", "    SPOOL-IDENTIFIER S-1",
  "WELD", "    END-POINT 300 0 0", "    SKEY WW", "    REPEAT-WELD-IDENTIFIER 1",
  "WELD", "    END-POINT 200 0 0", "    SKEY WW", "    REPEAT-WELD-IDENTIFIER 2",
].join("\n"))
assert.deepEqual(reducer.records.map((record) => [record.values.weld_number, record.values.weld_type, record.values.diameter_inch]), [["ISO-1001-1", "BW", ""], ["ISO-1001-2", "BW", "2"]])
assert.deepEqual(reducer.issues, [at("MISSING_VALUE", 10, "diameter_inch")])

// REPEAT-WELD-IDENTIFIER numbers the welds of one isometric, a weld number is one weld of the project: the isometric number goes in front
const numbered = (fileName: string, settings: typeof DEFAULT_PCF_SETTINGS = DEFAULT_PCF_SETTINGS) => pcfToWeldRecords(parsePcf(["UNITS-BORE MM", "PIPELINE-REFERENCE L-7", "PIPE", "    END-POINT 0 0 0 100 BW", "    END-POINT 100 0 0 100 BW", "    SPOOL-IDENTIFIER S-1", "WELD", "    END-POINT 100 0 0 100", "    SKEY WW", "    REPEAT-WELD-IDENTIFIER 1"].join("\n")), fileName, { pdsArea: "PDS-A", settings }).records.map((record) => record.values.weld_number)
assert.deepEqual(numbered("A.pcf"), ["A-1"], "the isometric number is the file name by default")
assert.deepEqual(numbered("B.pcf"), ["B-1"], "so the same identifier in another file is another weld")
assert.deepEqual(numbered("A.pcf", { ...DEFAULT_PCF_SETTINGS, isoNumberFrom: "pipelineReference" }), ["L-7-1"], "or the pipeline reference, when the template says so")
