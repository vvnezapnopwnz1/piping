// scripts/upg/files.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import { validateSheet } from "../../modules/imports/application/create-import"
import { templateHeaderRow } from "../../modules/imports/domain/import-type"
import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"
import { ERROR_ISO, PWHT_FORM_RULES, UPG_ISOS, WPS_GAP_ISO } from "./dataset"
import { addDays, errorFiles, importSheets, resolveStartDate, revisionFiles, spoolgenFiles, workbookSheets } from "./files"

const START = "2026-08-14"

test("the main SpoolGen package parses with zero client blockers", () => {
  const submission = buildSpoolgenSubmission(spoolgenFiles(UPG_ISOS))
  assert.equal(submission.summary.blockerCount, 0, JSON.stringify(submission.issues.filter((issue) => issue.severity === "blocker").slice(0, 3)))
  const weldRows = spoolgenFiles(UPG_ISOS).weld.trim().split("\n").length - 1
  assert.equal(weldRows, UPG_ISOS.flatMap((iso) => iso.spools.flatMap((spool) => spool.welds)).length)
})

test("the revision and error packages parse on the client", () => {
  assert.equal(buildSpoolgenSubmission(revisionFiles()).summary.blockerCount, 0)
  const error = errorFiles()
  assert.match(error.weld, new RegExp(ERROR_ISO))
  assert.equal(buildSpoolgenSubmission(error).summary.blockerCount, 0, "the error is server-side: no thickness rule")
})

test("every import sheet uses the app template header and validates without blockers", () => {
  for (const sheet of importSheets(START)) {
    assert.deepEqual(sheet.matrix[0], templateHeaderRow(sheet.importType), sheet.fileName)
    const outcome = validateSheet(sheet.importType, sheet.matrix)
    const blockers = outcome.issues.filter((issue) => issue.severity === "blocker")
    assert.equal(blockers.length, 0, `${sheet.fileName}: ${JSON.stringify(blockers.slice(0, 3))}`)
  }
})

test("the six import files are numbered in load order", () => {
  assert.deepEqual(importSheets(START).map((sheet) => sheet.fileName), [
    "01-pml.xlsx", "02-wps.xlsx", "03-welders.xlsx", "04-thickness.xlsx", "05-nde-matrix.xlsx", "06-test-packs.xlsx",
  ])
})

test("every trace number in the package exists in the PML file", () => {
  const pml = importSheets(START).find((sheet) => sheet.importType === "piping_material_list")!
  const traces = new Set(pml.matrix.slice(1).map((row) => String(row[2])))
  for (const line of spoolgenFiles(UPG_ISOS).trace.trim().split("\n").slice(1)) {
    assert.ok(traces.has(line.split("\t")[6]), line)
  }
})

test("every weld combination is covered by the NDE import or the PWHT form rules", () => {
  const nde = importSheets(START).find((sheet) => sheet.importType === "nde_matrix")!
  const covered = new Set(nde.matrix.slice(1).map((row) => `${row[0]}|${row[1]}|${row[2]}`))
  for (const rule of PWHT_FORM_RULES) covered.add(`${rule.serviceClass}|${rule.weldType}|${rule.location}`)
  for (const iso of UPG_ISOS) {
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      assert.ok(covered.has(`${iso.serviceClass}|${weld.weldType}|${weld.location}`), weld.weldNumber)
    }
  }
})

test("every class and diameter in the main package has a thickness rule; the error ISO has none", () => {
  const thickness = importSheets(START).find((sheet) => sheet.importType === "thickness_flange")!
  const rules = new Set(thickness.matrix.slice(1).map((row) => `${row[0]}|${row[1]}`))
  for (const iso of UPG_ISOS) {
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      assert.ok(rules.has(`${iso.serviceClass}|${weld.diameterInch}`), weld.weldNumber)
    }
  }
  assert.ok(!rules.has("CS150|14"))
  assert.ok(UPG_ISOS.some((iso) => iso.isoNumber === WPS_GAP_ISO))
})

test("the composition lists every ISO once with its first spool, consistent metadata and dates in range", () => {
  const composition = importSheets(START).find((sheet) => sheet.importType === "test_pack_composition")!
  const rows = composition.matrix.slice(1)
  const keys = rows.map((row) => `${row[2]}|${row[13]}`)
  assert.equal(new Set(keys).size, keys.length, "natural key is (test pack, ISO)")
  assert.equal(rows.length, UPG_ISOS.length)
  for (const row of rows) {
    assert.equal(row[15], `${row[13]}-S1`)
    assert.equal(row[16], 1, "Spool Revision is the spool sequence number")
    assert.equal(row[6], addDays(START, 42))
    assert.equal(row[7], addDays(START, 55))
  }
})

test("the workbook opens with README and holds every import sheet and the four SpoolGen sheets", () => {
  const names = workbookSheets(START).map((sheet) => sheet.name)
  assert.equal(names[0], "README")
  for (const expected of ["Ввести вручную", "PML", "WPS", "Сварщики", "Толщины", "NDE", "WELD", "TRACE", "BOLT", "SUPP", "Тест-пакеты"]) {
    assert.ok(names.includes(expected), expected)
  }
})

test("regenerating keeps an existing start date unless a new start is asked for", () => {
  assert.equal(resolveStartDate({ startDate: "2026-08-01" }, "2026-10-09", false), "2026-08-01")
  assert.equal(resolveStartDate({ startDate: "2026-08-01" }, "2026-10-09", true), "2026-08-14")
  assert.equal(resolveStartDate(null, "2026-10-09", false), "2026-08-14")
})
