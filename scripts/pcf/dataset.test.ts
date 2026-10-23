import assert from "node:assert/strict"
import test from "node:test"

import { buildIsos, isosOf } from "../upg/builders"
import { PCF_SPEC } from "./dataset"

const isos = isosOf(PCF_SPEC)

test("the project has exactly 5 ISOs in 1 pack with cohort A", () => {
  assert.equal(isos.length, 5)
  assert.equal(PCF_SPEC.isoGroups.length, 1)
  const group = PCF_SPEC.isoGroups[0]
  assert.equal(group.cohort, "A")
  assert.equal(group.testPack, "TP-100-01")
  assert.equal(group.count, 5)

  const packNames = new Set(PCF_SPEC.isoGroups.map((g) => g.testPack))
  assert.equal(packNames.size, 1)

  const packIsos = isos.filter((iso) => iso.testPack === group.testPack)
  assert.equal(packIsos.length, 5)
  assert.equal(new Set(packIsos.map((iso) => `${iso.systemCode}|${iso.subsystemCode}|${iso.serviceClass}`)).size, 1)
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
    const classSpec = PCF_SPEC.serviceClasses[iso.serviceClass]
    for (const weld of iso.spools.flatMap((s) => s.welds)) {
      assert.equal(typeof classSpec.thicknessByDiameter[weld.diameterInch], "number")
      assert.ok(weld.thicknessMm > 0)
    }
  }
  for (const classSpec of Object.values(PCF_SPEC.serviceClasses)) {
    for (const diameter of classSpec.mainDiameters) {
      assert.equal(typeof classSpec.thicknessByDiameter[diameter], "number")
    }
    if (classSpec.branchDiameter !== null) {
      assert.equal(typeof classSpec.thicknessByDiameter[classSpec.branchDiameter], "number")
    }
  }
  assert.equal(PCF_SPEC.special.errorIso, null)
})

test("NDE rules cover every built weld without duplicate keys", () => {
  const weldTriples = new Set(
    isos.flatMap((iso) =>
      iso.spools.flatMap((spool) =>
        spool.welds.map((weld) => `${iso.serviceClass}|${weld.weldType}|${weld.location}`),
      ),
    ),
  )
  const ruleKey = (r: { serviceClass: string; weldType: string; location: string }) =>
    `${r.serviceClass}|${r.weldType}|${r.location}`
  const importKeys = PCF_SPEC.ndeImportRules.map(ruleKey)
  const pwhtKeys = PCF_SPEC.pwhtFormRules.map(ruleKey)
  const allKeys = [...importKeys, ...pwhtKeys]
  assert.equal(new Set(allKeys).size, allKeys.length, "no duplicate rule keys")
  for (const triple of weldTriples) {
    const matching = allKeys.filter((k) => k === triple)
    assert.equal(matching.length, 1, `triple ${triple} must have exactly one rule`)
  }
})

test("WPS covers every built weld", () => {
  for (const iso of isos) {
    const material = PCF_SPEC.serviceClasses[iso.serviceClass].materialTypeCode
    const wpsMap = PCF_SPEC.wpsByMaterial[material]!
    for (const weld of iso.spools.flatMap((s) => s.welds)) {
      const wpsCode = weld.location === "shop" ? wpsMap.shop : wpsMap.field
      const wps = PCF_SPEC.weldingProcedures.find((p) => p.code === wpsCode)!
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

test("welders are qualified for procedures with pool >= 2 per WPS and count 4", () => {
  assert.equal(PCF_SPEC.welders.length, 4)
  for (const welder of PCF_SPEC.welders) {
    assert.equal(welder.wpsCodes.length, 1)
    for (const wpsCode of welder.wpsCodes) {
      const wps = PCF_SPEC.weldingProcedures.find((p) => p.code === wpsCode)
      assert.ok(wps, `WPS ${wpsCode} exists`)
      assert.equal(wps.subcontractor, welder.subcontractor)
    }
  }
  for (const proc of PCF_SPEC.weldingProcedures) {
    const qualified = PCF_SPEC.welders.filter((w) => w.wpsCodes.includes(proc.code))
    assert.ok(qualified.length >= 2, `at least 2 welders for ${proc.code}`)
  }
})

test("PCF-1 has no special cases and empty pack scenario", () => {
  assert.equal(PCF_SPEC.special.wpsGap, null)
  assert.deepEqual(PCF_SPEC.special.threadIsos, [])
  assert.equal(PCF_SPEC.special.revision, null)
  assert.equal(PCF_SPEC.special.rejectWeld, null)
  assert.equal(PCF_SPEC.special.overdueSpool, null)
  assert.equal(PCF_SPEC.special.errorIso, null)
  assert.equal(PCF_SPEC.manualPack, null)
  assert.deepEqual(PCF_SPEC.packScenario, [])
})

test("the description is deterministic and memoized", () => {
  assert.deepEqual(buildIsos(PCF_SPEC), buildIsos(PCF_SPEC))
  assert.equal(isosOf(PCF_SPEC), isosOf(PCF_SPEC))
})
