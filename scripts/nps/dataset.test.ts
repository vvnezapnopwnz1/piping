// scripts/nps/dataset.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  buildIsos,
  errorIso,
  isosOf,
  revisionR1,
  spoolByNumber,
} from "../upg/builders"
import { NPS_SPEC } from "./dataset"

const isos = isosOf(NPS_SPEC)

test("the project has exactly 36 ISOs in 8 packs with cohorts A2 B3 C2 D1", () => {
  assert.equal(isos.length, 36)
  const cohortCounts = NPS_SPEC.isoGroups.reduce<Record<string, number>>((acc, g) => {
    acc[g.cohort] = (acc[g.cohort] ?? 0) + 1
    return acc
  }, {})
  assert.deepEqual(cohortCounts, { A: 2, B: 3, C: 2, D: 1 })
  const packNames = new Set(NPS_SPEC.isoGroups.map((g) => g.testPack))
  assert.equal(packNames.size, 8)
  for (const group of NPS_SPEC.isoGroups) {
    const packIsos = isos.filter((iso) => iso.testPack === group.testPack)
    assert.equal(packIsos.length, group.count)
    assert.equal(new Set(packIsos.map((iso) => `${iso.systemCode}|${iso.subsystemCode}|${iso.serviceClass}`)).size, 1)
  }
})

test("spools and welds count within expected range", () => {
  const spools = isos.flatMap((iso) => iso.spools)
  const welds = spools.flatMap((spool) => spool.welds)
  assert.ok(spools.length >= 80 && spools.length <= 90, `spools: ${spools.length}`)
  assert.ok(welds.length >= 400 && welds.length <= 600, `welds: ${welds.length}`)
  const shopWelds = welds.filter((w) => w.location === "shop")
  const shopShare = shopWelds.length / welds.length
  assert.ok(shopShare >= 0.75 && shopShare <= 0.9, `shop share: ${shopShare}`)
  assert.equal(welds.filter((w) => w.location === "field").length, spools.length)
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

test("every diameter used by a weld has a thickness in its class table", () => {
  for (const iso of isos) {
    const classSpec = NPS_SPEC.serviceClasses[iso.serviceClass]
    for (const weld of iso.spools.flatMap((s) => s.welds)) {
      assert.equal(typeof classSpec.thicknessByDiameter[weld.diameterInch], "number")
      assert.ok(weld.thicknessMm > 0)
    }
  }
  for (const classSpec of Object.values(NPS_SPEC.serviceClasses)) {
    for (const diameter of classSpec.mainDiameters) {
      assert.equal(typeof classSpec.thicknessByDiameter[diameter], "number")
    }
    if (classSpec.branchDiameter !== null) {
      assert.equal(typeof classSpec.thicknessByDiameter[classSpec.branchDiameter], "number")
    }
  }
  const err = errorIso(NPS_SPEC)!
  assert.equal(NPS_SPEC.serviceClasses[err.serviceClass].thicknessByDiameter[err.mainDiameter], undefined)
})

test("NDE and PWHT rules cover every built weld without duplicate keys", () => {
  const weldTriples = new Set(
    isos.flatMap((iso) =>
      iso.spools.flatMap((spool) =>
        spool.welds.map((weld) => `${iso.serviceClass}|${weld.weldType}|${weld.location}`),
      ),
    ),
  )
  const ruleKey = (r: { serviceClass: string; weldType: string; location: string }) =>
    `${r.serviceClass}|${r.weldType}|${r.location}`
  const importKeys = NPS_SPEC.ndeImportRules.map(ruleKey)
  const pwhtKeys = NPS_SPEC.pwhtFormRules.map(ruleKey)
  const allKeys = [...importKeys, ...pwhtKeys]
  assert.equal(new Set(allKeys).size, allKeys.length, "no duplicate rule keys")
  for (const triple of weldTriples) {
    const matching = allKeys.filter((k) => k === triple)
    assert.equal(matching.length, 1, `triple ${triple} must have exactly one rule`)
  }
})

test("PWHT rules only for CS300H butt welds and thickness threshold behaves correctly", () => {
  assert.ok(NPS_SPEC.pwhtFormRules.every((r) => r.serviceClass === "CS300H" && r.weldType === "BW"))
  const cs300hBwWelds = isos
    .filter((iso) => iso.serviceClass === "CS300H")
    .flatMap((iso) => iso.spools.flatMap((s) => s.welds))
    .filter((w) => w.weldType === "BW")
  const thick = cs300hBwWelds.filter((w) => w.thicknessMm >= NPS_SPEC.pwhtThresholdMm)
  assert.ok(thick.length > 0, "CS300H BW welds >= 19 mm exist")
  const cs300h12Welds = cs300hBwWelds.filter((w) => w.diameterInch === 12)
  assert.ok(cs300h12Welds.length > 0)
  assert.ok(cs300h12Welds.every((w) => w.thicknessMm < NPS_SPEC.pwhtThresholdMm), "12\" CS300H BW welds below threshold")
  const otherWelds = isos
    .filter((iso) => iso.serviceClass !== "CS300H")
    .flatMap((iso) => iso.spools.flatMap((s) => s.welds))
  assert.ok(otherWelds.every((w) => w.thicknessMm < NPS_SPEC.pwhtThresholdMm), "no CS150/CS300 weld reaches threshold")
})

test("WPS covers every built weld", () => {
  for (const iso of isos) {
    const material = NPS_SPEC.serviceClasses[iso.serviceClass].materialTypeCode
    const wpsMap = NPS_SPEC.wpsByMaterial[material]!
    for (const weld of iso.spools.flatMap((s) => s.welds)) {
      const wpsCode = weld.location === "shop" ? wpsMap.shop : wpsMap.field
      const wps = NPS_SPEC.weldingProcedures.find((p) => p.code === wpsCode)!
      assert.ok(wps, `WPS ${wpsCode} exists`)
      assert.ok(
        weld.diameterInch >= wps.diameterFrom && weld.diameterInch <= wps.diameterTo,
        `${weld.weldNumber} diameter ${weld.diameterInch} outside WPS range`,
      )
      assert.ok(
        weld.thicknessMm >= wps.thicknessFrom && weld.thicknessMm <= wps.thicknessTo,
        `${weld.weldNumber} thickness ${weld.thicknessMm} outside WPS range`,
      )
    }
  }
})

test("welders are qualified for procedures with pool >= 2 per WPS and count in 8-10", () => {
  assert.ok(NPS_SPEC.welders.length >= 8 && NPS_SPEC.welders.length <= 10)
  for (const welder of NPS_SPEC.welders) {
    assert.equal(welder.wpsCodes.length, 1)
    for (const wpsCode of welder.wpsCodes) {
      const wps = NPS_SPEC.weldingProcedures.find((p) => p.code === wpsCode)
      assert.ok(wps, `WPS ${wpsCode} exists`)
      assert.equal(wps.subcontractor, welder.subcontractor)
    }
  }
  for (const proc of NPS_SPEC.weldingProcedures) {
    const qualified = NPS_SPEC.welders.filter((w) => w.wpsCodes.includes(proc.code))
    assert.ok(qualified.length >= 2, `at least 2 welders for ${proc.code}`)
  }
})

test("special cases point to existing things", () => {
  assert.equal(NPS_SPEC.special.wpsGap, null)
  const cohortAIsos = isos.filter((iso) => iso.cohort === "A")
  assert.deepEqual(NPS_SPEC.special.threadIsos, cohortAIsos.slice(0, 2).map((iso) => iso.isoNumber))
  for (const number of NPS_SPEC.special.threadIsos) {
    const iso = isos.find((candidate) => candidate.isoNumber === number)
    assert.ok(iso?.thread)
    assert.equal(iso?.testPack, NPS_SPEC.manualPack)
  }
  const rev = NPS_SPEC.special.revision!
  assert.ok(rev)
  const revIso = isos.find((iso) => iso.isoNumber === rev.iso)!
  assert.ok(revIso)
  assert.equal(revIso.cohort, "B")
  const beforeWelds = revIso.spools[0].welds.map((w) => w.weldNumber)
  assert.ok(!beforeWelds.includes(rev.weld))
  const revised = revisionR1(NPS_SPEC, revIso)
  const afterWelds = revised.spools[0].welds.map((w) => w.weldNumber)
  assert.deepEqual(afterWelds.filter((w) => !beforeWelds.includes(w)), [rev.weld])

  const reject = NPS_SPEC.special.rejectWeld!
  const thirdCohortAIso = cohortAIsos[2]
  const rejectWeldObj = thirdCohortAIso.spools[0].welds.find((w) => w.weldNumber === reject)
  assert.ok(rejectWeldObj)
  assert.equal(rejectWeldObj.location, "shop")

  const overdue = NPS_SPEC.special.overdueSpool!
  const found = spoolByNumber(NPS_SPEC, overdue)
  assert.ok(found)
  assert.equal(found.iso.cohort, "C")

  const err = errorIso(NPS_SPEC)!
  assert.ok(err)
  assert.equal(isos.find((iso) => iso.isoNumber === err.isoNumber), undefined)
  assert.equal(NPS_SPEC.serviceClasses[err.serviceClass].thicknessByDiameter[err.mainDiameter], undefined)
})

test("pack scenario references valid test packs and punches reference existing pack ISOs", () => {
  const validPacks = new Set(NPS_SPEC.isoGroups.map((g) => g.testPack))
  for (const step of NPS_SPEC.packScenario) {
    assert.ok(validPacks.has(step.testPack), `pack ${step.testPack} exists`)
    if (step.kind === "line_check") {
      for (const punch of step.punches) {
        const iso = isos.find((i) => i.isoNumber === punch.iso)
        assert.ok(iso, `punch ISO ${punch.iso} exists`)
        assert.equal(iso.testPack, step.testPack, `punch ISO ${punch.iso} belongs to ${step.testPack}`)
      }
    }
  }
})

test("no SS316 in project and flange ratings are only 150# or 300#", () => {
  for (const [code, cls] of Object.entries(NPS_SPEC.serviceClasses)) {
    assert.equal(cls.materialTypeCode, "CS", `${code} is carbon steel`)
    assert.ok(cls.flangeRating === "150#" || cls.flangeRating === "300#", `${code} rating ${cls.flangeRating}`)
  }
  assert.equal(NPS_SPEC.wpsByMaterial.SS316, undefined)
  assert.ok(NPS_SPEC.weldingProcedures.every((p) => p.materialType === "CS"))
})

test("the description is deterministic and memoized", () => {
  assert.deepEqual(buildIsos(NPS_SPEC), buildIsos(NPS_SPEC))
  assert.equal(isosOf(NPS_SPEC), isosOf(NPS_SPEC))
})
