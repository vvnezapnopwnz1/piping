import assert from "node:assert/strict"
import test from "node:test"

import { dossierLabels, dossier } from "./dossier-fixtures.test"
import { obligation, weld } from "./register-fixtures.test"
import { actFacts, actTable, toMegapascal, weldHistoryTable } from "./test-pack-dossier"

test("the act leaves the test date blank until the pack is tested", () => {
  const untested = actFacts(dossier({ pack: { testingCompletedOn: null } }), dossierLabels)
  assert.match(String(untested[2][1]), /^_+$/)

  const tested = actFacts(dossier(), dossierLabels)
  assert.equal(tested[2][1], "09.10.2026")
})

test("act has one row per line of the pack and blank measured fields", () => {
  const table = actTable(dossier({
    isos: [
      { isoNumber: "ISO-2", revisionNumber: "R0", lineNumber: "L-1" },
      { isoNumber: "ISO-1", revisionNumber: "R1", lineNumber: "L-1" },
      { isoNumber: "ISO-3", revisionNumber: "R0", lineNumber: "L-2" },
    ],
  }), dossierLabels)

  assert.equal(table.body.length, 2)
  assert.deepEqual(table.body.map((row) => row.slice(0, 2)), [[1, "L-1 (ISO-1, ISO-2)"], [2, "L-2 (ISO-3)"]])
  for (const row of table.body) {
    assert.deepEqual([row[2], row[3], row[7], row[8], row[9], row[10], row[11]], [null, null, null, null, null, null, null])
  }
  assert.deepEqual(table.groups?.map((group) => group.span), [2, 3, 3, 4])
})

test("act prints the line service, the test type and the test pressure in MPa", () => {
  const hydraulic = actTable(dossier(), dossierLabels).body[0]
  assert.deepEqual([hydraulic[4], hydraulic[5], hydraulic[6]], ["NG", "гидравлическое", "1,5"])

  const pneumatic = actTable(dossier({ pack: { testMedium: "P" } }), dossierLabels).body[0]
  assert.equal(pneumatic[5], "пневматическое")

  const visual = actTable(dossier({ pack: { testMedium: "V" } }), dossierLabels).body[0]
  assert.equal(visual[5], null)
})

test("toMegapascal converts bar and psi", () => {
  assert.equal(toMegapascal(10, "bar"), 1)
  assert.ok(Math.abs(toMegapascal(145.0377, "psi") - 1) < 0.001)
})

test("weld history covers shop and field welds and joins the NDE results of each weld", () => {
  const table = weldHistoryTable(dossier({
    welds: [weld({ weldNumber: "W-2", weldLocation: "field" }), weld({ weldJointRevisionId: "w1", weldNumber: "W-1" })],
    nde: [
      obligation({ weldNumber: "W-1", method: "rt", outcome: "accepted", reportNumber: "RT-1" }),
      obligation({ obligationId: "o2", weldNumber: "W-1", method: "vt", outcome: "accepted", reportNumber: "VT-1" }),
    ],
  }), dossierLabels)

  const at = (column: string) => table.head.indexOf(`col:${column}`)
  assert.deepEqual(table.body.map((row) => row[at("weld")]), ["W-1", "W-2"])
  assert.deepEqual(table.body.map((row) => row[at("location")]), ["цех", "монтаж"])
  assert.equal(table.body[0][at("ndeResult")], "РК: годен; ВИК: годен")
  assert.equal(table.body[0][at("reports")], "RT-1, VT-1")
  assert.equal(table.body[1][at("ndeResult")], null)
})
