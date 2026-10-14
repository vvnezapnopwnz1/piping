import assert from "node:assert/strict"
import test from "node:test"
import { createTranslator } from "next-intl"
import { I18N_DONE_PATHS, RU_COMPLETE_NAMESPACES } from "@/i18n/coverage"
import { messagesFor } from "@/i18n/messages"
import { findUiLiterals } from "@/scripts/i18n/find-ui-literals"
import { REPORT_DEFINITIONS } from "../domain/report"

const paths = ["modules/documents/ui", "modules/documents/application", "modules/documents/domain", "app/reports"]

test("documents and reports are in Russian coverage and carry no hard-coded English", () => {
  for (const path of paths) assert.ok(I18N_DONE_PATHS.includes(path), path)
  assert.ok(RU_COMPLETE_NAMESPACES.includes("documents"))
  assert.deepEqual(findUiLiterals(paths), [])
})

test("a report definition is a code: its words come from the messages", () => {
  for (const report of REPORT_DEFINITIONS) assert.ok(!("title" in report) && !("description" in report), report.code)
})

for (const locale of ["en", "ru"] as const) {
  test(`every report and screen message resolves in ${locale}`, () => {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "documents" })
    for (const report of REPORT_DEFINITIONS) {
      assert.ok(t(`reports.${report.code}.title`).length > 0, report.code)
      assert.ok(t(`reports.${report.code}.description`).length > 0, report.code)
    }
    assert.match(t("download", { format: "XLSX" }), /XLSX/)
    assert.match(t("error.failed", { detail: "read denied" }), /read denied/)
    assert.ok(t("error.unknownReport").length > 0)
  })
}
