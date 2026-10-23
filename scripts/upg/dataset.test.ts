// scripts/upg/dataset.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  buildIsos,
  errorIso,
  isosOf,
  revisionR1,
  spoolByNumber,
} from "./builders"
import { UPG_SPEC } from "./dataset"

const isos = isosOf(UPG_SPEC)
const revisionIso = UPG_SPEC.special.revision!.iso
const revisionWeld = UPG_SPEC.special.revision!.weld
const rejectWeld = UPG_SPEC.special.rejectWeld!
const overdueSpool = UPG_SPEC.special.overdueSpool!
const errorIsoNumber = UPG_SPEC.special.errorIso!.isoNumber
const wpsGapIso = UPG_SPEC.special.wpsGap!.iso

test("the project has about 40 ISOs, 100 spools and 500 welds", () => {
  const spools = isos.flatMap((iso) => iso.spools)
  const welds = spools.flatMap((spool) => spool.welds)
  assert.equal(isos.length, 40)
  assert.ok(spools.length >= 90 && spools.length <= 100, `spools: ${spools.length}`)
  assert.ok(welds.length >= 500 && welds.length <= 600, `welds: ${welds.length}`)
  assert.ok(welds.filter((weld) => weld.location === "field").length === spools.length)
})

test("the description is deterministic", () => {
  assert.deepEqual(buildIsos(UPG_SPEC), buildIsos(UPG_SPEC))
})

test("numbers are unique across the project", () => {
  const spools = isos.flatMap((iso) => iso.spools)
  const unique = (values: string[]) => new Set(values).size === values.length
  assert.ok(unique(isos.map((iso) => iso.isoNumber)))
  assert.ok(unique(spools.map((spool) => spool.spoolNumber)))
  assert.ok(unique(spools.flatMap((spool) => spool.welds.map((weld) => weld.weldNumber))))
  assert.ok(unique(spools.map((spool) => spool.supportNumber)))
  assert.ok(unique(spools.map((spool) => spool.flangeNumber)))
})

test("one line number and one service class per ISO", () => {
  for (const iso of isos) {
    assert.match(iso.lineNumber, new RegExp(`-${iso.serviceClass}$`))
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      assert.ok(weld.thicknessMm > 0, `${weld.weldNumber} has a thickness`)
    }
  }
})

test("every test pack holds one system, one subsystem and one service class", () => {
  for (const group of UPG_SPEC.isoGroups) {
    const packIsos = isos.filter((iso) => iso.testPack === group.testPack)
    assert.equal(packIsos.length, group.count)
    assert.equal(new Set(packIsos.map((iso) => `${iso.systemCode}|${iso.subsystemCode}|${iso.serviceClass}`)).size, 1)
  }
})

test("socket welds only on small bore, never on CS300, never in the field", () => {
  for (const iso of isos) {
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      if (weld.weldType !== "SW") continue
      assert.equal(weld.location, "shop")
      assert.notEqual(iso.serviceClass, "CS300")
      assert.equal(weld.diameterInch, 2)
    }
  }
})

test("the special ISOs and welds exist where the walkthrough expects them", () => {
  for (const number of UPG_SPEC.special.threadIsos) {
    const iso = isos.find((candidate) => candidate.isoNumber === number)
    assert.ok(iso?.thread, `${number} is a thread ISO`)
    assert.equal(iso?.testPack, "TP-100-01")
  }
  assert.equal(isos.filter((iso) => iso.thread).length, UPG_SPEC.special.threadIsos.length)
  assert.ok(isos.find((iso) => iso.isoNumber === revisionIso))
  assert.ok(spoolByNumber(UPG_SPEC, overdueSpool))
  const rejected = isos.flatMap((iso) => iso.spools).flatMap((spool) => spool.welds).find((weld) => weld.weldNumber === rejectWeld)
  assert.equal(rejected?.location, "shop")
  assert.equal(isos.find((iso) => iso.isoNumber === errorIsoNumber), undefined, "the error ISO is not in the main package")
})

test("revision R1 adds exactly one shop weld to spool S1", () => {
  const iso = isos.find((candidate) => candidate.isoNumber === revisionIso)!
  const revised = revisionR1(UPG_SPEC, iso)
  const before = iso.spools[0].welds.map((weld) => weld.weldNumber)
  const after = revised.spools[0].welds.map((weld) => weld.weldNumber)
  assert.deepEqual(after.filter((number) => !before.includes(number)), [revisionWeld])
  assert.deepEqual(revised.spools.slice(1), iso.spools.slice(1))
})

test("the error ISO uses a diameter no thickness rule covers", () => {
  const iso = errorIso(UPG_SPEC)!
  assert.equal(iso.isoNumber, errorIsoNumber)
  const diameters = iso.spools.flatMap((spool) => spool.welds.map((weld) => weld.diameterInch))
  for (const diameter of diameters) {
    assert.equal(UPG_SPEC.serviceClasses[iso.serviceClass].thicknessByDiameter[diameter], undefined)
  }
})

test("exactly one field weld falls outside every field WPS range", () => {
  const uncovered = isos.flatMap((iso) =>
    iso.spools.flatMap((spool) =>
      spool.welds
        .filter((weld) => weld.location === "field")
        .filter((weld) => {
          const wps = UPG_SPEC.weldingProcedures.find(
            (procedure) => procedure.code === UPG_SPEC.wpsByMaterial[UPG_SPEC.serviceClasses[iso.serviceClass].materialTypeCode]!.field,
          )!
          return weld.diameterInch < wps.diameterFrom || weld.diameterInch > wps.diameterTo
        })
        .map(() => iso.isoNumber),
    ),
  )
  assert.deepEqual(uncovered, [wpsGapIso])
})

test("CS300 welds at or above the PWHT threshold exist, and PWHT rules cover CS300 only", () => {
  const thick = isos
    .filter((iso) => iso.serviceClass === "CS300")
    .flatMap((iso) => iso.spools.flatMap((spool) => spool.welds))
    .filter((weld) => weld.thicknessMm >= UPG_SPEC.pwhtThresholdMm)
  assert.ok(thick.length > 0)
  assert.deepEqual([...new Set(UPG_SPEC.pwhtFormRules.map((rule) => rule.serviceClass))], ["CS300"])
})

test("isosOf memoizes per spec", () => {
  assert.equal(isosOf(UPG_SPEC), isosOf(UPG_SPEC))
  assert.deepEqual(isosOf(UPG_SPEC), buildIsos(UPG_SPEC))
})

test("ISO numbers follow the spec prefix", () => {
  assert.equal(isos[0].isoNumber, "UPG-100-1001")
  const customSpec = { ...UPG_SPEC, isoPrefix: "NPS" }
  const customIsos = buildIsos(customSpec)
  assert.equal(customIsos[0].isoNumber, "NPS-100-1001")
  assert.ok(customIsos[0].lineNumber.includes(UPG_SPEC.lineCode))
})

test("a spec without special cases builds the same ISOs without threads and without a WPS gap", () => {
  const cleanSpec = { ...UPG_SPEC, special: { ...UPG_SPEC.special, threadIsos: [], wpsGap: null } }
  const cleanIsos = buildIsos(cleanSpec)
  assert.equal(cleanIsos.length, isos.length)
  assert.equal(cleanIsos.filter((iso) => iso.thread).length, 0)
  for (const iso of cleanIsos) {
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      if (weld.location === "field") {
        assert.equal(weld.diameterInch, iso.mainDiameter)
      }
    }
  }
})

test("errorIso and revisionR1 follow the spec", () => {
  assert.equal(errorIso({ ...UPG_SPEC, special: { ...UPG_SPEC.special, errorIso: null } }), null)
  assert.throws(() => revisionR1({ ...UPG_SPEC, special: { ...UPG_SPEC.special, revision: null } }, isos[0]))
})
