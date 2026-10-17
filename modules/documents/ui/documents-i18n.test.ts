import assert from "node:assert/strict"
import test from "node:test"
import { createTranslator } from "next-intl"
import { I18N_DONE_PATHS, RU_COMPLETE_NAMESPACES } from "@/i18n/coverage"
import { messagesFor } from "@/i18n/messages"
import { findUiLiterals } from "@/scripts/i18n/find-ui-literals"
import { DOCUMENT_COLUMNS } from "../domain/registers"
import { DOCUMENT_DEFINITIONS } from "../domain/report"

const paths = ["modules/documents/ui", "modules/documents/application", "modules/documents/domain", "app/reports"]

test("documents and reports are in Russian coverage and carry no hard-coded English", () => {
  for (const path of paths) assert.ok(I18N_DONE_PATHS.includes(path), path)
  assert.ok(RU_COMPLETE_NAMESPACES.includes("documents"))
  assert.deepEqual(findUiLiterals(paths), [])
})

test("a document definition is a code: its words come from the messages", () => {
  for (const definition of DOCUMENT_DEFINITIONS) {
    assert.ok(!("title" in definition) && !("description" in definition), definition.code)
  }
})

for (const locale of ["en", "ru"] as const) {
  test(`every document, column and page word resolves in ${locale}`, () => {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "documents" })
    for (const definition of DOCUMENT_DEFINITIONS) {
      assert.ok(t(`reports.${definition.code}.title`).length > 0, definition.code)
      assert.ok(t(`reports.${definition.code}.description`).length > 0, definition.code)
    }
    for (const column of DOCUMENT_COLUMNS) assert.ok(t(`columns.${column}`).length > 0, column)
    assert.match(t("chrome.page", { n: 2, total: 5 }), /2.*5/)
    assert.match(t("dossier.title", { number: "TP-100-01" }), /TP-100-01/)
    assert.match(t("dossier.composition", { isos: 3, welds: 21 }), /3.*21/)
    assert.match(t("dossier.button", { format: "PDF" }), /PDF/)
    assert.match(t("dossier.act.footnote"), /359/)
    assert.match(t("download", { format: "XLSX" }), /XLSX/)
    assert.match(t("error.failed", { detail: "read denied" }), /read denied/)
    assert.ok(t("error.unknownReport").length > 0)
  })
}
