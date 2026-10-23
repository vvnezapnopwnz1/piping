import assert from "node:assert/strict"
import test from "node:test"

import { buildPcfSubmission } from "../../modules/engineering/application/import-pcf"
import { DEFAULT_PCF_SETTINGS } from "../../modules/engineering/domain/import-template"
import { endPoints, parsePcf } from "../../modules/engineering/domain/parsers/pcf"
import { boreToInch } from "../../modules/engineering/domain/pcf-welds"
import { NPS_SPEC } from "../nps/dataset"
import { isosOf } from "../upg/builders"
import { UPG_SPEC } from "../upg/dataset"
import { PCF_SPEC } from "./dataset"
import { dnOfInch, pcfFileName, pcfFiles, pcfText, weldIdentifier } from "./pcf-writer"

test("(а) each ISO builds a valid submission with exact welds matching specification", () => {
  for (const spec of [PCF_SPEC, UPG_SPEC, NPS_SPEC]) {
    for (const iso of isosOf(spec)) {
      const fileName = pcfFileName(iso)
      const text = pcfText(iso)
      const submission = buildPcfSubmission([{ fileName, text }], {
        pdsArea: "A-100",
        settings: DEFAULT_PCF_SETTINGS,
      })

      assert.deepEqual(submission.issues, [], `issues should be empty for ${iso.isoNumber}`)
      assert.equal(submission.canSubmit, true, `canSubmit should be true for ${iso.isoNumber}`)

      const weldRows = submission.rows
        .filter((r) => r.normalizedValues.entity_type === "weld_joint")
        .map((r) => r.normalizedValues)

      const actualTuples = weldRows.map(
        (v) =>
          `${v.iso_number}|${v.spool_number}|${v.weld_number}|${v.weld_location}|${v.weld_type}|${Number(v.diameter_inch)}`,
      )

      const expectedTuples = iso.spools.flatMap((spool) =>
        spool.welds.map(
          (weld) =>
            `${iso.isoNumber}|${spool.spoolNumber}|${iso.isoNumber}-${weldIdentifier(iso, weld.weldNumber)}|${weld.location}|${weld.weldType}|${weld.diameterInch}`,
        ),
      )

      assert.equal(actualTuples.length, expectedTuples.length, `weld count mismatch for ${iso.isoNumber}`)
      assert.equal(new Set(actualTuples).size, actualTuples.length, `duplicate welds found for ${iso.isoNumber}`)
      assert.deepEqual(new Set(actualTuples), new Set(expectedTuples), `weld tuples mismatch for ${iso.isoNumber}`)
    }
  }
})

test("(а) all PCF_SPEC files submitted together yield matching isometric, spool, and weld rows", () => {
  const files = pcfFiles(PCF_SPEC)
  const submission = buildPcfSubmission(files, {
    pdsArea: "A-100",
    settings: DEFAULT_PCF_SETTINGS,
  })

  assert.deepEqual(submission.issues, [])
  assert.equal(submission.canSubmit, true)

  const isos = isosOf(PCF_SPEC)

  const isoRows = submission.rows
    .filter((r) => r.normalizedValues.entity_type === "isometric")
    .map((r) => r.normalizedValues)
  assert.equal(isoRows.length, isos.length)
  for (const iso of isos) {
    const row = isoRows.find((r) => r.iso_number === iso.isoNumber)
    assert.ok(row, `missing isometric row for ${iso.isoNumber}`)
    assert.equal(row.revision_number, "R0")
    assert.equal(row.pds_area, "A-100")
    assert.equal(row.service_class, iso.serviceClass)
    assert.equal(row.line_number, iso.lineNumber)
  }

  const spoolRows = submission.rows
    .filter((r) => r.normalizedValues.entity_type === "spool")
    .map((r) => r.normalizedValues)
  const expectedSpoolNumbers = isos.flatMap((iso) => iso.spools.map((s) => s.spoolNumber))
  assert.equal(spoolRows.length, expectedSpoolNumbers.length)
  assert.deepEqual(
    new Set(spoolRows.map((r) => r.spool_number)),
    new Set(expectedSpoolNumbers),
  )

  const weldRows = submission.rows
    .filter((r) => r.normalizedValues.entity_type === "weld_joint")
    .map((r) => r.normalizedValues)
  const actualTuples = weldRows.map(
    (v) =>
      `${v.iso_number}|${v.spool_number}|${v.weld_number}|${v.weld_location}|${v.weld_type}|${Number(v.diameter_inch)}`,
  )
  const expectedTuples = isos.flatMap((iso) =>
    iso.spools.flatMap((spool) =>
      spool.welds.map(
        (weld) =>
          `${iso.isoNumber}|${spool.spoolNumber}|${iso.isoNumber}-${weldIdentifier(iso, weld.weldNumber)}|${weld.location}|${weld.weldType}|${weld.diameterInch}`,
      ),
    ),
  )
  assert.equal(actualTuples.length, expectedTuples.length)
  assert.deepEqual(new Set(actualTuples), new Set(expectedTuples))
})

type Spot = { x: number; y: number; z: number }
const sameSpot = (a: Spot, b: Spot) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01 && Math.abs(a.z - b.z) < 0.01
const branchPointOf = (block: { attributes: { keyword: string; value: string }[] }): Spot | null => {
  const record = block.attributes.find((attribute) => attribute.keyword === "BRANCH1-POINT")
  if (!record) return null
  const [x, y, z] = record.value.split(/\s+/).map(Number)
  return { x, y, z }
}

test("(б) geometry connectivity: each part starts where the run ended or at a tee branch, each weld sits on its master", () => {
  for (const file of pcfFiles(PCF_SPEC)) {
    const parsed = parsePcf(file.text)
    const parts = parsed.components.filter((component) => component.keyword !== "WELD")
    // The run continues from the end of the last part of the main chain; a nipple starts at the branch point of a tee before it.
    let runEnd: Spot | null = null
    const branches: Spot[] = []
    for (const part of parts) {
      const ends = endPoints(part)
      assert.ok(ends.length === 2, `${part.keyword} has two end points`)
      const onBranch = branches.some((branch) => sameSpot(branch, ends[0]))
      if (runEnd !== null && !onBranch) assert.ok(sameSpot(runEnd, ends[0]), `${file.fileName}: ${part.keyword} line ${part.line} starts where the run ended`)
      if (!onBranch) runEnd = ends[1]
      const branch = branchPointOf(part)
      if (branch) branches.push(branch)
    }

    const idOf = (block: { attributes: { keyword: string; value: string }[] }, keyword: string) => block.attributes.find((attribute) => attribute.keyword === keyword)?.value
    const byId = new Map(parsed.components.map((component) => [idOf(component, "COMPONENT-IDENTIFIER"), component]))
    assert.equal(byId.size, parsed.components.length, "component identifiers are unique")
    for (const weld of parsed.components.filter((component) => component.keyword === "WELD")) {
      const master = byId.get(idOf(weld, "MASTER-COMPONENT-IDENTIFIER"))
      assert.ok(master, `${file.fileName}: master of the weld on line ${weld.line} exists`)
      const spot = endPoints(weld)[0]
      const branch = branchPointOf(master)
      assert.ok(endPoints(master).some((end) => sameSpot(end, spot)) || (branch !== null && sameSpot(branch, spot)), `${file.fileName}: weld on line ${weld.line} sits on its master`)
    }
  }
})

test("(в) bore of main chain end points matches main DN and nipple pipe matches branch DN", () => {
  for (const iso of isosOf(PCF_SPEC)) {
    const text = pcfText(iso)
    const parsed = parsePcf(text)
    const mainDn = dnOfInch(iso.mainDiameter)
    const branchDn = dnOfInch(PCF_SPEC.serviceClasses[iso.serviceClass].branchDiameter!)

    const nonWelds = parsed.components.filter((c) => c.keyword !== "WELD")
    for (const comp of nonWelds) {
      const pts = endPoints(comp)
      const isNipple = pts.some((pt) => pt.endType === "SW")
      const expectedBore = isNipple ? branchDn : mainDn
      for (const pt of pts) {
        assert.equal(pt.bore, expectedBore, `bore on ${comp.keyword} should be ${expectedBore}`)
      }
    }
  }
})

test("(г) dnOfInch is consistent with boreToInch for standard diameters", () => {
  const inches = [2, 3, 4, 6, 8, 12, 16, 20, 24]
  for (const inch of inches) {
    const dn = dnOfInch(inch)
    assert.equal(boreToInch(dn, "MM"), inch)
  }
  assert.throws(() => dnOfInch(999), /Unknown pipe diameter/)
})

test("(д) pcfText is deterministic, contains no tabs, and ends with newline", () => {
  for (const iso of isosOf(PCF_SPEC)) {
    const text1 = pcfText(iso)
    const text2 = pcfText(iso)
    assert.equal(text1, text2)
    assert.doesNotMatch(text1, /\t/)
    assert.ok(text1.endsWith("\n"))
  }
})

test("the identifiers are the welds' places in the isometric, from 1, so no two files share a project-wide number", () => {
  const ids = (text: string) => [...text.matchAll(/REPEAT-WELD-IDENTIFIER (\d+)/g)].map((m) => Number(m[1]))
  for (const file of pcfFiles(PCF_SPEC)) {
    const found = ids(file.text)
    assert.deepEqual([...found].sort((a, b) => a - b), found.map((_, index) => index + 1), `${file.fileName}: 1..n, each once`)
  }
  const submission = buildPcfSubmission(pcfFiles(PCF_SPEC), { pdsArea: "A-100", settings: DEFAULT_PCF_SETTINGS })
  const numbers = submission.rows.filter((row) => row.normalizedValues.entity_type === "weld_joint").map((row) => row.normalizedValues.weld_number)
  assert.equal(new Set(numbers).size, numbers.length, "unique over the whole upload")
  assert.deepEqual(submission.issues.filter((issue) => issue.severity === "blocker"), [])
})
