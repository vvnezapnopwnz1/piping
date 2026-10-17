import assert from "node:assert/strict"
import test from "node:test"

import type { DocumentTable } from "./document"
import { labels, obligation, pack, punch, weld } from "./register-fixtures.test"
import { ndeRegisterTable, punchTable, testPackSummaryTable, weldLogTable, type DocumentColumn } from "./registers"

function column(table: DocumentTable, id: DocumentColumn): (string | number | null)[] {
  const index = table.head.indexOf(`col:${id}`)
  assert.ok(index >= 0, `column ${id} is missing`)
  return table.body.map((row) => row[index])
}

test("weld log sorts ISO, spool and weld in natural order", () => {
  const table = weldLogTable([
    weld({ weldJointRevisionId: "a", isoNumber: "ISO-10", weldNumber: "W-1" }),
    weld({ weldJointRevisionId: "b", isoNumber: "ISO-2", weldNumber: "W-10" }),
    weld({ weldJointRevisionId: "c", isoNumber: "ISO-2", weldNumber: "W-2" }),
  ], labels)

  assert.deepEqual(column(table, "iso"), ["ISO-2", "ISO-2", "ISO-10"])
  assert.deepEqual(column(table, "weld"), ["W-2", "W-10", "W-1"])
})

test("weld log prints locations, NDE and PWHT through labels, never raw codes", () => {
  const table = weldLogTable([
    weld({ weldLocation: "field", ndeMethods: ["rt", "vt"], ndePending: 1, pwhtRequired: true, pwhtAccepted: false }),
  ], labels)

  assert.deepEqual(column(table, "location"), ["монтаж"])
  assert.deepEqual(column(table, "ndeMethods"), ["РК, ВИК"])
  assert.deepEqual(column(table, "ndeStatus"), ["ожидает"])
  assert.deepEqual(column(table, "pwht"), ["требуется"])
  assert.doesNotMatch(JSON.stringify(table.body), /"(field|shop)"/)
})

test("weld log prints dates in the reader's format and joins welders and heats", () => {
  const table = weldLogTable([weld({ welderCodes: ["KZ-014", "KZ-022"], traceNumbers: ["HT-1", "HT-2"] })], labels)

  assert.deepEqual(column(table, "weldedOn"), ["01.10.2026"])
  assert.deepEqual(column(table, "welders"), ["KZ-014, KZ-022"])
  assert.deepEqual(column(table, "heat"), ["HT-1, HT-2"])
})

test("NDE register shows the report number and defect for a rejected weld", () => {
  const table = ndeRegisterTable([
    obligation({ disposition: "rejected", outcome: "rejected", reportNumber: "RT-0012-04", defectCode: "PO" }),
  ], labels)

  assert.deepEqual(column(table, "outcome"), ["брак"])
  assert.deepEqual(column(table, "report"), ["RT-0012-04"])
  assert.deepEqual(column(table, "defect"), ["PO"])
  assert.deepEqual(column(table, "method"), ["РК"])
  assert.deepEqual(column(table, "selection"), ["сплошной 100%"])
})

test("NDE register leaves the result empty for a pending obligation", () => {
  const table = ndeRegisterTable([
    obligation({ disposition: "pending", examinedOn: null, outcome: null, reportNumber: null, batchNumber: null }),
  ], labels)

  assert.deepEqual(column(table, "disposition"), ["ожидает"])
  assert.deepEqual(column(table, "examinedOn"), [null])
  assert.deepEqual(column(table, "outcome"), [null])
  assert.deepEqual(column(table, "report"), [null])
})

test("test pack summary has one row per pack with stage dates", () => {
  const table = testPackSummaryTable([
    pack({ testPackId: "b", testPackNumber: "TP-200-01", isRft: false, rftOn: null, testingStartedOn: null, testingCompletedOn: null }),
    pack(),
  ], labels)

  assert.deepEqual(column(table, "testPack"), ["TP-100-01", "TP-200-01"])
  assert.deepEqual(column(table, "rft"), ["да", "нет"])
  assert.deepEqual(column(table, "testingStarted"), ["08.10.2026", null])
  assert.deepEqual(column(table, "testPressure"), ["15 bar", "15 bar"])
  assert.deepEqual(column(table, "welds"), ["24 / 24", "24 / 24"])
  assert.deepEqual(column(table, "medium"), ["гидравлическое", "гидравлическое"])
})

test("punch register marks open and closed items", () => {
  const table = punchTable([
    punch({ id: "b", itemNumber: "2", completionDate: "2026-10-04" }),
    punch(),
  ], labels)

  assert.deepEqual(column(table, "item"), ["1", "2"])
  assert.deepEqual(column(table, "status"), ["открыто", "закрыто"])
  assert.deepEqual(column(table, "completionDate"), [null, "04.10.2026"])
})
