import assert from "node:assert/strict"
import { attribute, endPoints, parsePcf } from "./pcf"

// An excerpt in the layout of the Hexagon PCF Reference Guide: item at column 1, attribute at column 5.
const sample = [
  "ISOGEN-FILES ISOGEN.FLS", "UNITS-BORE MM", "UNITS-CO-ORDS MM",
  "PIPELINE-REFERENCE 100-P-1001", "    REVISION 2", "    PIPING-SPEC CS150",
  "PIPE", "    COMPONENT-IDENTIFIER 1", "    END-POINT 0.0000 0.0000 0.0000 100 BW", "    END-POINT 2500.0000 0.0000 0.0000 100 BW", "    SPOOL-IDENTIFIER 100-P-1001-S01",
  "WELD", "    COMPONENT-IDENTIFIER 2", "    MASTER-COMPONENT-IDENTIFIER 1", "    END-POINT 2500.0000 0.0000 0.0000 100", "    END-POINT 2500.0000 0.0000 0.0000 100", "    SKEY WW", "    REPEAT-WELD-IDENTIFIER 5",
  "MATERIALS", "MATERIAL-IDENTIFIER 1", "    ITEM-CODE PA5BSTD", "    DESCRIPTION PIPE, CS API 5L SML, GRD B, STD WT",
].join("\n")
const file = parsePcf(sample)
assert.equal(file.boreUnit, "MM")
assert.deepEqual(file.header.map((r) => [r.keyword, r.value, r.line]), [["ISOGEN-FILES", "ISOGEN.FLS", 1], ["UNITS-BORE", "MM", 2], ["UNITS-CO-ORDS", "MM", 3]])
assert.equal(file.pipelines.length, 1)
assert.equal(file.pipelines[0].value, "100-P-1001")
assert.equal(file.pipelines[0].line, 4)
assert.equal(attribute(file.pipelines[0], "REVISION"), "2")
assert.deepEqual(file.components.map((c) => c.keyword), ["PIPE", "WELD"])
assert.equal(file.components[1].line, 12)
assert.deepEqual(endPoints(file.components[0])[0], { x: 0, y: 0, z: 0, bore: 100, endType: "BW" })
assert.equal(endPoints(file.components[0]).length, 2)
assert.deepEqual(endPoints(file.components[1]).map((p) => p.endType), [null, null])
assert.equal(attribute(file.components[1], "REPEAT-WELD-IDENTIFIER"), "5")
assert.equal(attribute(file.components[1], "SKEY"), "WW")
assert.deepEqual(file.materials.map((m) => [m.keyword, m.value]), [["MATERIAL-IDENTIFIER", "1"]])
assert.equal(attribute(file.materials[0], "DESCRIPTION"), "PIPE, CS API 5L SML, GRD B, STD WT")
assert.equal(attribute(file.materials[0], "ITEM-CODE"), "PA5BSTD")
// MATERIALS itself is a switch, never a block
assert.ok(![...file.components, ...file.materials].some((b) => b.keyword === "MATERIALS"))

// Plant 3D style: pipeline attributes at column 1, tabs instead of spaces
const p3d = parsePcf("UNITS-BORE INCH\nPIPELINE-REFERENCE L-1\nPIPING-SPEC CS150\nREVISION 0\nPIPE\n\tEND-POINT 0 0 0 4\n\tEND-POINT 10 0 0 4")
assert.equal(p3d.boreUnit, "INCH")
assert.equal(attribute(p3d.pipelines[0], "PIPING-SPEC"), "CS150")
assert.equal(attribute(p3d.pipelines[0], "REVISION"), "0")
assert.deepEqual(p3d.pipelines[0].attributes.map((r) => r.line), [3, 4])
assert.equal(p3d.components.length, 1)
assert.equal(p3d.components[0].keyword, "PIPE")
assert.deepEqual(endPoints(p3d.components[0]).map((p) => p.x), [0, 10])
assert.deepEqual(p3d.header.map((r) => r.keyword), ["UNITS-BORE"])

// The bore unit is one of the three PCF knows, otherwise unknown
assert.equal(parsePcf("UNITS-BORE FEET\nPIPE\n    END-POINT 0 0 0 4").boreUnit, null)
assert.equal(parsePcf("UNITS-BORE INCH-SIXTEENTH").boreUnit, "INCH-SIXTEENTH")
assert.equal(parsePcf("UNITS-BORE mm").boreUnit, "MM")
assert.equal(parsePcf("PIPE\n    END-POINT 0 0 0 4").boreUnit, null)

// A decimal comma is not read: the number stays unknown
assert.equal(endPoints(parsePcf("PIPE\n    END-POINT 0 0 0 4,0000").components[0])[0].bore, null)
// A short END-POINT keeps what it has; one without coordinates is not a point
assert.deepEqual(endPoints(parsePcf("PIPE\n    END-POINT 1 2 3").components[0]), [{ x: 1, y: 2, z: 3, bore: null, endType: null }])
assert.deepEqual(endPoints(parsePcf("PIPE\n    END-POINT 1 2").components[0]), [])
assert.deepEqual(endPoints(parsePcf("PIPE\n    END-POINT 1,5 2 3 4").components[0]), [])
assert.deepEqual(endPoints(parsePcf("PIPE\n    END-POINT -1.5 2 -3 4 BW EXTRA").components[0]), [{ x: -1.5, y: 2, z: -3, bore: 4, endType: "BW" }])
assert.deepEqual(endPoints(parsePcf("PIPE\n    COMPONENT-IDENTIFIER 1").components[0]), [])
assert.deepEqual(endPoints(parsePcf("PIPE\n    end-point 0   0 0  4  bw").components[0]), [{ x: 0, y: 0, z: 0, bore: 4, endType: "BW" }])

// attribute: first value, key case ignored, null when absent
const dup = parsePcf("PIPE\n    ITEM-CODE A\n    ITEM-CODE B\n    EMPTY").components[0]
assert.equal(attribute(dup, "item-code"), "A")
assert.equal(attribute(dup, "NOPE"), null)
assert.equal(attribute(dup, "EMPTY"), "")

// Tolerant reading: CRLF, blank lines, an unknown keyword, a whitespace-only line and an indented line before any element
const messy = parsePcf("    ORPHAN 1\r\nUNITS-BORE MM\r\n\r\nPIPELINE-REFERENCE A\r\n\r\nFUTURE-THING 7\r\n    FOO bar\r\n\r\nPIPE\r\n  \r\n    END-POINT 0 0 0 100\r\n")
assert.equal(messy.boreUnit, "MM")
assert.deepEqual(messy.header.map((r) => [r.keyword, r.line]), [["UNITS-BORE", 2]])
assert.deepEqual(messy.components.map((c) => [c.keyword, c.value, c.line]), [["FUTURE-THING", "7", 6], ["PIPE", "", 9]])
assert.equal(attribute(messy.components[0], "FOO"), "bar")
assert.deepEqual(messy.pipelines[0].attributes, [])
assert.deepEqual(parsePcf(""), { header: [], pipelines: [], components: [], materials: [], boreUnit: null })
assert.deepEqual(parsePcf("\n  \n\t\n"), { header: [], pipelines: [], components: [], materials: [], boreUnit: null })

// Several pipelines in one file; an element without attributes after a component is a component, not a pipeline attribute
const many = parsePcf("UNITS-BORE MM\nPIPELINE-REFERENCE L-1\n    REVISION 1\nPIPE\n    END-POINT 0 0 0 50\nPIPELINE-REFERENCE L-2\nPIPING-SPEC AS1\nELBOW\n    END-POINT 0 0 0 50\nSTRAY\nMATERIALS\nMATERIAL-IDENTIFIER 1\nMATERIAL-IDENTIFIER 2")
assert.deepEqual(many.pipelines.map((p) => p.value), ["L-1", "L-2"])
assert.equal(attribute(many.pipelines[0], "REVISION"), "1")
assert.equal(attribute(many.pipelines[0], "PIPING-SPEC"), null)
assert.equal(attribute(many.pipelines[1], "PIPING-SPEC"), "AS1")
assert.deepEqual(many.components.map((c) => c.keyword), ["PIPE", "ELBOW", "STRAY"])
assert.deepEqual(many.materials.map((m) => m.value), ["1", "2"])

// A pipeline with indented attributes of its own (Hexagon): an item with no attribute after it is a component, not a pipeline attribute
const hexagon = parsePcf("PIPELINE-REFERENCE A\n    REVISION 1\nWELD\nPIPE\n    END-POINT 0 0 0 50\n    END-POINT 5 0 0 50")
assert.deepEqual(hexagon.pipelines[0].attributes.map((r) => r.keyword), ["REVISION"])
assert.deepEqual(hexagon.components.map((c) => c.keyword), ["WELD", "PIPE"])
assert.equal(endPoints(hexagon.components[1]).length, 2)

// A second pipeline after MATERIALS puts its components back into components
const afterMaterials = parsePcf("PIPELINE-REFERENCE A\nPIPE\n    END-POINT 0 0 0 50\n    END-POINT 5 0 0 50\nMATERIALS\nMATERIAL-IDENTIFIER 1\n    ITEM-CODE X\nPIPELINE-REFERENCE B\nWELD\n    END-POINT 5 0 0 50\n    END-POINT 5 0 0 50")
assert.deepEqual(afterMaterials.pipelines.map((p) => p.value), ["A", "B"])
assert.deepEqual(afterMaterials.components.map((c) => c.keyword), ["PIPE", "WELD"])
assert.deepEqual(afterMaterials.materials.map((m) => m.value), ["1"])
assert.equal(attribute(afterMaterials.materials[0], "ITEM-CODE"), "X")

// A file written in lower case reads the same: keywords and end types are stored upper-case
const lower = parsePcf("units-bore mm\npipeline-reference L-1\n    revision 2\npipe\n    end-point 0 0 0 100 bw\nweld\n    end-point 0 0 0 100 bw\n    end-point 0 0 0 100 sw\nmaterials\nmaterial-identifier 1\n    item-code a")
assert.equal(lower.boreUnit, "MM")
assert.deepEqual(lower.header.map((r) => r.keyword), ["UNITS-BORE"])
assert.equal(lower.pipelines[0].keyword, "PIPELINE-REFERENCE")
assert.equal(lower.pipelines[0].attributes[0].keyword, "REVISION")
assert.deepEqual(lower.components.map((c) => c.keyword), ["PIPE", "WELD"])
assert.deepEqual(endPoints(lower.components[1]).map((p) => p.endType), ["BW", "SW"])
assert.equal(lower.components[1].attributes[0].keyword, "END-POINT")
assert.deepEqual(lower.materials.map((m) => m.keyword), ["MATERIAL-IDENTIFIER"])
assert.equal(attribute(lower.materials[0], "ITEM-CODE"), "a")

// A value keeps any character, line separators of Unicode included, and a line made of them is blank; nothing throws
const separators = parsePcf("PIPE\n    DESCRIPTION a\u2028b\u2029c\n\u2028\n    TAG\u2028x\u2029")
assert.equal(attribute(separators.components[0], "DESCRIPTION"), "a\u2028b\u2029c")
assert.equal(attribute(separators.components[0], "TAG"), "x")
assert.equal(parsePcf("PIPE\u2028WELD\n    END-POINT 1\u20282\u20293 4").components[0].keyword, "PIPE")
assert.deepEqual(endPoints(parsePcf("PIPE\n    END-POINT 1\u20282\u20293 4").components[0]), [{ x: 1, y: 2, z: 3, bore: 4, endType: null }])
