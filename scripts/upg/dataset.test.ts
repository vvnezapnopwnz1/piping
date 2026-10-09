// scripts/upg/dataset.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  ERROR_ISO,
  ISO_GROUPS,
  OVERDUE_SPOOL,
  PWHT_FORM_RULES,
  PWHT_THRESHOLD_MM,
  REJECT_WELD,
  REVISION_ISO,
  REVISION_WELD,
  SERVICE_CLASSES,
  THREAD_ISOS,
  UPG_ISOS,
  WELDING_PROCEDURES,
  WPS_BY_MATERIAL,
  WPS_GAP_ISO,
  buildUpgIsos,
  errorIso,
  revisionR1,
  spoolByNumber,
} from "./dataset"

test("the project has about 40 ISOs, 100 spools and 500 welds", () => {
  const spools = UPG_ISOS.flatMap((iso) => iso.spools)
  const welds = spools.flatMap((spool) => spool.welds)
  assert.equal(UPG_ISOS.length, 40)
  assert.ok(spools.length >= 90 && spools.length <= 100, `spools: ${spools.length}`)
  assert.ok(welds.length >= 500 && welds.length <= 600, `welds: ${welds.length}`)
  assert.ok(welds.filter((weld) => weld.location === "field").length === spools.length)
})

test("the description is deterministic", () => {
  assert.deepEqual(buildUpgIsos(), buildUpgIsos())
})

test("numbers are unique across the project", () => {
  const spools = UPG_ISOS.flatMap((iso) => iso.spools)
  const unique = (values: string[]) => new Set(values).size === values.length
  assert.ok(unique(UPG_ISOS.map((iso) => iso.isoNumber)))
  assert.ok(unique(spools.map((spool) => spool.spoolNumber)))
  assert.ok(unique(spools.flatMap((spool) => spool.welds.map((weld) => weld.weldNumber))))
  assert.ok(unique(spools.map((spool) => spool.supportNumber)))
  assert.ok(unique(spools.map((spool) => spool.flangeNumber)))
})

test("one line number and one service class per ISO", () => {
  for (const iso of UPG_ISOS) {
    assert.match(iso.lineNumber, new RegExp(`-${iso.serviceClass}$`))
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      assert.ok(weld.thicknessMm > 0, `${weld.weldNumber} has a thickness`)
    }
  }
})

test("every test pack holds one system, one subsystem and one service class", () => {
  for (const group of ISO_GROUPS) {
    const isos = UPG_ISOS.filter((iso) => iso.testPack === group.testPack)
    assert.equal(isos.length, group.count)
    assert.equal(new Set(isos.map((iso) => `${iso.systemCode}|${iso.subsystemCode}|${iso.serviceClass}`)).size, 1)
  }
})

test("socket welds only on small bore, never on CS300, never in the field", () => {
  for (const iso of UPG_ISOS) {
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      if (weld.weldType !== "SW") continue
      assert.equal(weld.location, "shop")
      assert.notEqual(iso.serviceClass, "CS300")
      assert.equal(weld.diameterInch, 2)
    }
  }
})

test("the special ISOs and welds exist where the walkthrough expects them", () => {
  for (const number of THREAD_ISOS) {
    const iso = UPG_ISOS.find((candidate) => candidate.isoNumber === number)
    assert.ok(iso?.thread, `${number} is a thread ISO`)
    assert.equal(iso?.testPack, "TP-100-01")
  }
  assert.equal(UPG_ISOS.filter((iso) => iso.thread).length, THREAD_ISOS.length)
  assert.ok(UPG_ISOS.find((iso) => iso.isoNumber === REVISION_ISO))
  assert.ok(spoolByNumber(OVERDUE_SPOOL))
  const rejected = UPG_ISOS.flatMap((iso) => iso.spools).flatMap((spool) => spool.welds).find((weld) => weld.weldNumber === REJECT_WELD)
  assert.equal(rejected?.location, "shop")
  assert.equal(UPG_ISOS.find((iso) => iso.isoNumber === ERROR_ISO), undefined, "the error ISO is not in the main package")
})

test("revision R1 adds exactly one shop weld to spool S1", () => {
  const iso = UPG_ISOS.find((candidate) => candidate.isoNumber === REVISION_ISO)!
  const revised = revisionR1(iso)
  const before = iso.spools[0].welds.map((weld) => weld.weldNumber)
  const after = revised.spools[0].welds.map((weld) => weld.weldNumber)
  assert.deepEqual(after.filter((number) => !before.includes(number)), [REVISION_WELD])
  assert.deepEqual(revised.spools.slice(1), iso.spools.slice(1))
})

test("the error ISO uses a diameter no thickness rule covers", () => {
  const iso = errorIso()
  assert.equal(iso.isoNumber, ERROR_ISO)
  const diameters = iso.spools.flatMap((spool) => spool.welds.map((weld) => weld.diameterInch))
  for (const diameter of diameters) {
    assert.equal(SERVICE_CLASSES[iso.serviceClass].thicknessByDiameter[diameter], undefined)
  }
})

test("exactly one field weld falls outside every field WPS range", () => {
  const uncovered = UPG_ISOS.flatMap((iso) =>
    iso.spools.flatMap((spool) =>
      spool.welds
        .filter((weld) => weld.location === "field")
        .filter((weld) => {
          const wps = WELDING_PROCEDURES.find(
            (procedure) => procedure.code === WPS_BY_MATERIAL[SERVICE_CLASSES[iso.serviceClass].materialTypeCode].field,
          )!
          return weld.diameterInch < wps.diameterFrom || weld.diameterInch > wps.diameterTo
        })
        .map(() => iso.isoNumber),
    ),
  )
  assert.deepEqual(uncovered, [WPS_GAP_ISO])
})

test("CS300 welds at or above the PWHT threshold exist, and PWHT rules cover CS300 only", () => {
  const thick = UPG_ISOS.filter((iso) => iso.serviceClass === "CS300")
    .flatMap((iso) => iso.spools.flatMap((spool) => spool.welds))
    .filter((weld) => weld.thicknessMm >= PWHT_THRESHOLD_MM)
  assert.ok(thick.length > 0)
  assert.deepEqual([...new Set(PWHT_FORM_RULES.map((rule) => rule.serviceClass))], ["CS300"])
})
