import assert from "node:assert/strict"
import test from "node:test"

import { buildSpoolgenSubmission } from "../../modules/engineering/application/import-spooling"
import { readWorkbookUpload } from "../../modules/engineering/application/import-table"
import { SPOOLGEN_FILE_ROLES } from "../../modules/engineering/domain/spoolgen-file"
import { buildWorkbook, readNumberedSheets } from "../../modules/imports/infrastructure/xlsx-workbook"
import { NPS_SPEC } from "../nps/dataset"
import { PCF_SPEC } from "../pcf/dataset"
import { isosOf } from "./builders"
import { UPG_SPEC } from "./dataset"
import { pdsAreaOfPcf, readmeLines, spoolgenFiles, workbookSheets } from "./files"
import type { ProjectSpec } from "./spec"

const START_DATE = "2026-01-01"

const countsOf = (rows: readonly { normalizedValues: Record<string, string> }[]): Record<string, number> => {
  const counts: Record<string, number> = {}
  for (const row of rows) counts[row.normalizedValues.entity_type] = (counts[row.normalizedValues.entity_type] ?? 0) + 1
  return counts
}

// The workbook the scripts upload is the one `--spooling workbook` reads: the app's own reader must accept it
// and find in its WELD/TRACE/BOLT/SUPP sheets the records the four texts hold.
for (const spec of [UPG_SPEC, NPS_SPEC]) {
  test(`the ${spec.project.activityCode} workbook is ready for the app's reader and gives the records of the four texts`, () => {
    const bytes = buildWorkbook(workbookSheets(spec, START_DATE).map((sheet) => ({ name: sheet.name.slice(0, 31), rows: sheet.matrix })))
    const reading = readWorkbookUpload(`${spec.project.activityCode}.xlsx`, readNumberedSheets(bytes, SPOOLGEN_FILE_ROLES))
    assert.equal(reading.kind, "ready")
    if (reading.kind !== "ready") return
    assert.deepEqual(reading.submission.issues, [])
    assert.equal(reading.submission.canSubmit, true)
    const fromTexts = buildSpoolgenSubmission(spoolgenFiles(spec, isosOf(spec)))
    assert.deepEqual(countsOf(reading.submission.rows), countsOf(fromTexts.rows))
    const counts = countsOf(reading.submission.rows)
    const spools = isosOf(spec).flatMap((iso) => iso.spools)
    assert.equal(counts.weld_joint, spools.flatMap((spool) => spool.welds).length)
    assert.equal(counts.material, spools.flatMap((spool) => spool.materials).length)
    assert.equal(counts.flange_joint, spools.length)
    assert.equal(counts.support, spools.length)
  })
}

test("a PCF project names one PDS area and says in its README what a PCF does not carry", () => {
  assert.equal(pdsAreaOfPcf(PCF_SPEC), "A-100")
  const lines = readmeLines(PCF_SPEC).join("\n")
  assert.match(lines, /pcf\/\*\.pcf/)
  assert.match(lines, /только стыки/)
  assert.doesNotMatch(readmeLines(UPG_SPEC).join("\n"), /только стыки/)
})

test("a PCF upload with ISOs in two PDS areas is refused", () => {
  const spec: ProjectSpec = { ...PCF_SPEC, isoGroups: [...PCF_SPEC.isoGroups, { ...PCF_SPEC.isoGroups[0], pdsArea: "A-200", firstSeq: 2001 }] }
  assert.throws(() => pdsAreaOfPcf(spec), /one PDS area/)
})
