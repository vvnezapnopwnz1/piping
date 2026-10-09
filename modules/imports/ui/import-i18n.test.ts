import assert from "node:assert/strict"
import test from "node:test"
import { createTranslator } from "next-intl"
import { I18N_DONE_PATHS, RU_COMPLETE_NAMESPACES } from "@/i18n/coverage"
import { messagesFor } from "@/i18n/messages"
import { findUiLiterals } from "@/scripts/i18n/find-ui-literals"
import { IMPORT_TYPES } from "../domain/import-type"
import type { ImportRowIssue } from "../domain/import-issue"
import { describeApplyReason } from "./apply-reason-text"
import { describeImportIssue } from "./import-issue-text"

const paths = ["modules/imports/ui", "modules/imports/application", "modules/imports/domain"]

test("imports are in Russian coverage and carry no hard-coded English", () => {
  for (const path of paths) assert.ok(I18N_DONE_PATHS.includes(path), path)
  assert.ok(RU_COMPLETE_NAMESPACES.includes("spooling"))
  assert.deepEqual(findUiLiterals(paths), [])
})

const SAMPLES: ImportRowIssue[] = [
  { rowNumber: null, columnName: null, severity: "blocker", code: "EMPTY_SHEET" },
  { rowNumber: null, columnName: "ident_code", severity: "blocker", code: "MISSING_COLUMN", header: "Ident Code" },
  { rowNumber: 1, columnName: "ident_code", severity: "blocker", code: "REQUIRED", header: "Ident Code" },
  { rowNumber: 1, columnName: "diameter_inch", severity: "blocker", code: "NOT_A_NUMBER", header: "Dia Inch", received: "abc" },
  { rowNumber: 1, columnName: "direction", severity: "blocker", code: "TRACKING_DIRECTION" },
  { rowNumber: 1, columnName: "occurred_at", severity: "blocker", code: "TRACKING_TIMESTAMP" },
  { rowNumber: 1, columnName: "diameter_to_inch", severity: "blocker", code: "INVALID_RANGE", range: "diameter" },
  { rowNumber: 1, columnName: "thickness_to_mm", severity: "blocker", code: "INVALID_RANGE", range: "thickness" },
  { rowNumber: 1, columnName: "planned_end_on", severity: "blocker", code: "INVALID_RANGE", range: "plannedDates" },
  { rowNumber: 1, columnName: "rt_coverage", severity: "blocker", code: "OUT_OF_RANGE", bound: "percent" },
  { rowNumber: 1, columnName: "test_pressure", severity: "blocker", code: "OUT_OF_RANGE", bound: "positive" },
  { rowNumber: 2, columnName: "ident_code", severity: "blocker", code: "DUPLICATE_IN_FILE", keys: ["ident_code", "trace_number"] },
  { rowNumber: 1, columnName: "joint_date", severity: "blocker", code: "INVALID_DATE" },
  { rowNumber: 1, columnName: "weld_location", severity: "blocker", code: "INVALID_VALUE", expected: ["shop", "assembly", "field"] },
  { rowNumber: 1, columnName: "system", severity: "blocker", code: "INCONSISTENT_TEST_PACK_METADATA" },
  { rowNumber: 1, columnName: "jointer_codes", severity: "blocker", code: "DUPLICATE_JOINTER" },
  { rowNumber: 1, columnName: "jointing_value", severity: "warning", code: "UT_CONFIGURATION_WARNING" },
]

for (const locale of ["en", "ru"] as const) {
  test(`every import issue is a sentence in ${locale}`, () => {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })
    for (const issue of SAMPLES) {
      const text = describeImportIssue(t, issue)
      assert.ok(text.length > 0 && !/^spooling\./.test(text), issue.code)
      assert.doesNotMatch(text, /\{|\}/, issue.code)
    }
    for (const type of [...IMPORT_TYPES, "spooling_definition"]) assert.ok(t(`importType.${type}` as Parameters<typeof t>[0]).length > 0)
  })
}

test("issue sentences keep file data and name the values", () => {
  const t = createTranslator({ locale: "ru", messages: messagesFor("ru"), namespace: "spooling" })
  const text = describeImportIssue(t, SAMPLES[3])
  assert.match(text, /Dia Inch/)
  assert.match(text, /abc/)
  assert.doesNotMatch(text, /must be numeric/)
})

test("apply gate reasons render in both languages", () => {
  for (const locale of ["en", "ru"] as const) {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })
    for (const reason of [
      { code: "alreadyApplied" }, { code: "closed" }, { code: "notValidated" },
      { code: "blockers", count: 3 }, { code: "conflictsUnconfirmed", count: 2 },
    ] as const) {
      const text = describeApplyReason(t, reason)
      assert.ok(text.length > 0 && !/^spooling\./.test(text), reason.code)
    }
  }
})
