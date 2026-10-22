// scripts/upg/files.test.ts
import assert from "node:assert/strict"
import test from "node:test"

import { validateSheet } from "../../modules/imports/application/create-import"
import { templateHeaderRow } from "../../modules/imports/domain/import-type"
import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"
import { isosOf } from "./builders"
import { UPG_SPEC } from "./dataset"
import {
  addDays,
  errorFiles,
  importSheets,
  readmeLines,
  resolveStartDate,
  revisionFiles,
  spoolgenFiles,
  workbookFileName,
  workbookSheets,
} from "./files"

const START = "2026-08-14"

test("the main SpoolGen package parses with zero client blockers", () => {
  const submission = buildSpoolgenSubmission(spoolgenFiles(UPG_SPEC, isosOf(UPG_SPEC)))
  assert.equal(submission.summary.blockerCount, 0, JSON.stringify(submission.issues.filter((issue) => issue.severity === "blocker").slice(0, 3)))
  const weldRows = spoolgenFiles(UPG_SPEC, isosOf(UPG_SPEC)).weld.trim().split("\n").length - 1
  assert.equal(weldRows, isosOf(UPG_SPEC).flatMap((iso) => iso.spools.flatMap((spool) => spool.welds)).length)
})

test("the revision and error packages parse on the client", () => {
  assert.equal(buildSpoolgenSubmission(revisionFiles(UPG_SPEC)!).summary.blockerCount, 0)
  const error = errorFiles(UPG_SPEC)!
  assert.match(error.weld, new RegExp(UPG_SPEC.special.errorIso!.isoNumber))
  assert.equal(buildSpoolgenSubmission(error).summary.blockerCount, 0, "the error is server-side: no thickness rule")
})

test("every import sheet uses the app template header and validates without blockers", () => {
  for (const sheet of importSheets(UPG_SPEC, START)) {
    assert.deepEqual(sheet.matrix[0], templateHeaderRow(sheet.importType), sheet.fileName)
    const outcome = validateSheet(sheet.importType, sheet.matrix)
    const blockers = outcome.issues.filter((issue) => issue.severity === "blocker")
    assert.equal(blockers.length, 0, `${sheet.fileName}: ${JSON.stringify(blockers.slice(0, 3))}`)
  }
})

test("the WPS and welder files carry their own dates, taken from the project start", () => {
  const wps = importSheets(UPG_SPEC, START).find((sheet) => sheet.importType === "welding_procedure")!
  const approved = wps.matrix[0].indexOf("Approved On")
  assert.ok(approved >= 0)
  for (const row of wps.matrix.slice(1)) assert.equal(row[approved], addDays(START, -14))
  const welders = importSheets(UPG_SPEC, START).find((sheet) => sheet.importType === "welder_qualification")!
  const expires = welders.matrix[0].indexOf("Expires On")
  assert.ok(expires >= 0)
  for (const row of welders.matrix.slice(1)) assert.equal(row[expires], addDays(START, 730))
})

test("the six import files are numbered in load order", () => {
  assert.deepEqual(importSheets(UPG_SPEC, START).map((sheet) => sheet.fileName), [
    "01-pml.xlsx", "02-wps.xlsx", "03-welders.xlsx", "04-thickness.xlsx", "05-nde-matrix.xlsx", "06-test-packs.xlsx",
  ])
})

test("every trace number in the package exists in the PML file", () => {
  const pml = importSheets(UPG_SPEC, START).find((sheet) => sheet.importType === "piping_material_list")!
  const traces = new Set(pml.matrix.slice(1).map((row) => String(row[2])))
  for (const line of spoolgenFiles(UPG_SPEC, isosOf(UPG_SPEC)).trace.trim().split("\n").slice(1)) {
    assert.ok(traces.has(line.split("\t")[6]), line)
  }
})

test("every weld combination is covered by the NDE import or the PWHT form rules", () => {
  const nde = importSheets(UPG_SPEC, START).find((sheet) => sheet.importType === "nde_matrix")!
  const covered = new Set(nde.matrix.slice(1).map((row) => `${row[0]}|${row[1]}|${row[2]}`))
  for (const rule of UPG_SPEC.pwhtFormRules) covered.add(`${rule.serviceClass}|${rule.weldType}|${rule.location}`)
  for (const iso of isosOf(UPG_SPEC)) {
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      assert.ok(covered.has(`${iso.serviceClass}|${weld.weldType}|${weld.location}`), weld.weldNumber)
    }
  }
})

test("every class and diameter in the main package has a thickness rule; the error ISO has none", () => {
  const thickness = importSheets(UPG_SPEC, START).find((sheet) => sheet.importType === "thickness_flange")!
  const rules = new Set(thickness.matrix.slice(1).map((row) => `${row[0]}|${row[1]}`))
  for (const iso of isosOf(UPG_SPEC)) {
    for (const weld of iso.spools.flatMap((spool) => spool.welds)) {
      assert.ok(rules.has(`${iso.serviceClass}|${weld.diameterInch}`), weld.weldNumber)
    }
  }
  assert.ok(!rules.has("CS150|14"))
  assert.ok(isosOf(UPG_SPEC).some((iso) => iso.isoNumber === UPG_SPEC.special.wpsGap!.iso))
})

test("the composition lists every ISO once with its first spool, consistent metadata and dates in range", () => {
  const composition = importSheets(UPG_SPEC, START).find((sheet) => sheet.importType === "test_pack_composition")!
  const rows = composition.matrix.slice(1)
  const keys = rows.map((row) => `${row[2]}|${row[13]}`)
  assert.equal(new Set(keys).size, keys.length, "natural key is (test pack, ISO)")
  assert.equal(rows.length, isosOf(UPG_SPEC).length)
  for (const row of rows) {
    assert.equal(row[15], `${row[13]}-S1`)
    assert.equal(row[16], row[14], "Spool Revision is the ISO revision the spool last changed in: R0 here")
    assert.equal(row[6], addDays(START, 42))
    assert.equal(row[7], addDays(START, 55))
  }
})

test("the workbook opens with README and holds every import sheet and the four SpoolGen sheets", () => {
  const names = workbookSheets(UPG_SPEC, START).map((sheet) => sheet.name)
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

test("readmeLines for UPG-1 names the error set, the PWHT form rules and the revision week", () => {
  const lines = readmeLines(UPG_SPEC)
  assert.equal(lines[0], "Демо-проект UPG-1 — порядок загрузки")
  assert.equal(lines.length, 8)
  assert.equal(lines[4], "4. Справочники проекта → NDE-матрица: ввести руками два правила CS300 с PWHT (лист «Ввести вручную»).")
})

test("a spec without an error ISO, revision or PWHT rules drops those steps and file sets", () => {
  const bare = { ...UPG_SPEC, special: { ...UPG_SPEC.special, errorIso: null, revision: null }, pwhtFormRules: [] }
  assert.equal(errorFiles(bare), null)
  assert.equal(revisionFiles(bare), null)
  assert.equal(readmeLines(bare).length, 6, "title plus five steps")
  for (const line of readmeLines(bare)) {
    assert.ok(!line.includes("error/weld.txt"))
    assert.ok(!line.includes("revision/"))
  }
})

test("workbookFileName follows the project code", () => {
  assert.equal(workbookFileName(UPG_SPEC), "UPG-1.xlsx")
})
