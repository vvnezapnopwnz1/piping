import assert from "node:assert/strict"
import test from "node:test"
import { createTranslator } from "next-intl"
import { messagesFor } from "@/i18n/messages"
import type { StoredImportIssue } from "@/modules/imports/domain/stored-import-issue"
import { SPOOLGEN_ISSUE_CODES, SPOOLING_SERVER_ISSUE_CODES, type SpoolingServerIssueCode } from "../domain/spoolgen-issue"
import { buildTableSubmission, type TableSource } from "../application/import-table"
import { buildIssueEntries, type IssuePlace } from "../application/issue-entries"
import { describeIssueEntry, describeIssuePlace, formatRowRanges } from "./issue-entry-text"

const translatorFor = (locale: "en" | "ru") => createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index)
const SAMPLE_ARGS = { pdsArea: "A", serviceClass: "C", weldType: "BW", diameter: "4", thickness: "6", hasThickness: "yes", location: "shop", iso: "ISO-1", spool: "S-1", weld: "W-1", kind: "weld", number: "W-1", column: "PDS_AREA", value: "x", count: 8000 }
const EMPTY_PLACE: IssuePlace = { sheet: null, file: null, column: null, rows: [] }

test("rows read as ranges, at most ten of them", () => {
  assert.deepEqual(formatRowRanges([...range(2, 41), 45]), { text: "2–41, 45", more: 0 })
  assert.deepEqual(formatRowRanges([7]), { text: "7", more: 0 })
  assert.deepEqual(formatRowRanges([3, 4]), { text: "3–4", more: 0 })
  assert.deepEqual(formatRowRanges([45, 3, 4, 3]), { text: "3–4, 45", more: 0 })
  assert.deepEqual(formatRowRanges(range(1, 15).map((n) => n * 2)), { text: "2, 4, 6, 8, 10, 12, 14, 16, 18, 20", more: 5 })
})

test("a place reads as Excel shows it", () => {
  const ru = translatorFor("ru")
  assert.equal(describeIssuePlace(ru, { sheet: "weld", file: null, column: "PDS_AREA", rows: [...range(2, 41), 45] }), "Лист weld, колонка PDS_AREA, строки 2–41, 45")
  assert.equal(describeIssuePlace(ru, { sheet: "weld", file: null, column: null, rows: [7] }), "Лист weld, строка 7")
  assert.equal(describeIssuePlace(ru, { sheet: null, file: "weld.txt", column: "PDS_AREA", rows: [1] }), "weld.txt, колонка PDS_AREA, строка 1")
  assert.equal(describeIssuePlace(translatorFor("en"), { sheet: "weld", file: null, column: "PDS_AREA", rows: [2, 3] }), "Sheet weld, column PDS_AREA, rows 2–3")
  assert.equal(describeIssuePlace(ru, EMPTY_PLACE), "")
  assert.match(describeIssuePlace(ru, { sheet: "weld", file: null, column: null, rows: range(1, 15).map((n) => n * 2) }), /, 20 и ещё 5 строк$/)
})

for (const locale of ["en", "ru"] as const) {
  test(`every browser and server code has a title in ${locale}`, () => {
    for (const code of [...SPOOLGEN_ISSUE_CODES, ...SPOOLING_SERVER_ISSUE_CODES]) {
      const text = describeIssueEntry(translatorFor(locale), { severity: "blocker", code, args: SAMPLE_ARGS, message: "server sentence", place: EMPTY_PLACE })
      assert.ok(text.length > 0 && text !== "server sentence" && !/^spooling\./.test(text), code)
      assert.doesNotMatch(text, /\{|\}/, code)
    }
  })
}

test("every server code reaches the screen in Russian, through the entries", () => {
  const header = ["ISO_NUMBER", "ISO_REVISION", "PDS_AREA", "SERVICE_CLASS", "SPOOL_NUMBER", "WELD_NUMBER", "WELD_TYPE", "DIAMETER_INCH", "WELD_LOCATION"]
  const weld: TableSource = { role: "weld", fileName: "book.xlsx", sheet: "weld", matrix: [header, ["ISO-1", "R0", "Z-9", "CS150", "S-1", "W-1", "BW", 4, "field"]], rowNumbers: [1, 2] }
  const trace: TableSource = { role: "trace", fileName: "book.xlsx", sheet: "trace", matrix: [["ISO_NUMBER", "SPOOL_NUMBER", "IDENT_CODE"], ["ISO-1", "S-9", "PIPE"]], rowNumbers: [1, 2] }
  const submission = buildTableSubmission([weld, trace])
  const rowOf = (kind: string) => submission.rows.find((row) => row.normalizedValues.entity_type === kind)!.rowNumber
  const raisedOn: Record<SpoolingServerIssueCode, number | null> = {
    SRV_PDS_MISSING: rowOf("isometric"), SRV_SERVICE_CLASS_MISSING: rowOf("isometric"),
    SRV_WELD_TYPE_MISSING: rowOf("weld_joint"), SRV_THICKNESS_MISSING: rowOf("weld_joint"), SRV_NDE_MATRIX_MISSING: rowOf("weld_joint"), SRV_WPS_MISSING: rowOf("weld_joint"),
    SRV_ORPHAN_SPOOL: rowOf("material"), SRV_ISO_MIXED_LINE: null, SRV_ISO_MIXED_SERVICE_CLASS: null, SRV_SPOOLING_SPINE_MISSING: null, SRV_SPOOLING_JOB_TOO_LARGE: null,
  }
  for (const code of SPOOLING_SERVER_ISSUE_CODES) {
    const issue: StoredImportIssue = { code, rowNumber: raisedOn[code], columnName: null, severity: "blocker", message: "English server sentence", fileName: null }
    for (const entry of buildIssueEntries(submission, [issue])) {
      const ru = describeIssueEntry(translatorFor("ru"), entry)
      assert.notEqual(ru, describeIssueEntry(translatorFor("en"), entry), code)
      assert.notEqual(ru, "English server sentence", code)
      assert.doesNotMatch(ru, /\{|\}|«»/, `${code}: ${ru}`)
    }
  }
  const nde = buildIssueEntries(submission, [{ code: "SRV_NDE_MATRIX_MISSING", rowNumber: rowOf("weld_joint"), columnName: "weld_type", severity: "blocker", message: "m", fileName: null }]).find((entry) => entry.code === "SRV_NDE_MATRIX_MISSING")!
  assert.equal(describeIssueEntry(translatorFor("ru"), nde), "Нет правила матрицы NDE для класса сервиса «CS150», типа стыка «BW» и монтажных стыков.")
})

test("an unknown server code keeps the server's own sentence", () => {
  assert.equal(describeIssueEntry(translatorFor("ru"), { severity: "warning", code: "SRV_NEW", args: {}, message: "New check", place: EMPTY_PLACE }), "New check")
})

test("the summary counts errors in Russian plurals and says what to do", () => {
  const ru = translatorFor("ru")
  assert.equal(ru("issueSummary.errors", { count: 1 }), "1 ошибка — исправьте файл и загрузите его снова.")
  assert.equal(ru("issueSummary.errors", { count: 3 }), "3 ошибки — исправьте файл и загрузите его снова.")
  assert.equal(ru("issueSummary.errors", { count: 5 }), "5 ошибок — исправьте файл и загрузите его снова.")
  assert.equal(ru("issueSummary.none"), "Ошибок нет — проверьте изменения ниже и примените импорт.")
  assert.equal(translatorFor("en")("issueSummary.errors", { count: 1 }), "1 error: fix the file and upload it again.")
})
