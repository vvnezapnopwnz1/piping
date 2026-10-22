import assert from "node:assert/strict"
import test from "node:test"
import { createTranslator } from "next-intl"
import { I18N_DONE_PATHS, RU_COMPLETE_NAMESPACES } from "@/i18n/coverage"
import { messagesFor } from "@/i18n/messages"
import { findUiLiterals } from "@/scripts/i18n/find-ui-literals"
import { CHANGE_TYPES } from "../domain/diff"
import { IMPORT_TEMPLATE_ERROR_CODES } from "../domain/import-template"
import { ENGINEERING_ENTITY_TYPES } from "../domain/entity"
import { SPOOLGEN_ISSUE_CODES } from "../domain/spoolgen-issue"
import type { RevisionApplyReason } from "../application/resolve-revision"
import { describeIssueLocation } from "../../imports/ui/import-issue-text"
import { describeRevisionReason } from "./revision-reason-text"
import { describeSpoolgenIssue } from "./spoolgen-issue-text"

const paths = ["modules/engineering/ui", "modules/engineering/application", "modules/engineering/domain", "app/spooling"]

test("engineering and spooling pages are in Russian coverage and carry no hard-coded English", () => {
  for (const path of paths) assert.ok(I18N_DONE_PATHS.includes(path), path)
  assert.deepEqual(findUiLiterals(paths), [])
})

for (const locale of ["en", "ru"] as const) {
  const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })

  test(`every SpoolGen issue code is a sentence in ${locale}`, () => {
    for (const code of SPOOLGEN_ISSUE_CODES) {
      const text = describeSpoolgenIssue(t, { code, columnName: "weld", message: code })
      assert.ok(text.length > 0 && !/^spooling\./.test(text), code)
      assert.doesNotMatch(text, /\{|\}/, code)
    }
  })

  test(`revision gate reasons, changes and entities resolve in ${locale}`, () => {
    const reasons: RevisionApplyReason[] = [
      { code: "alreadyApplied" }, { code: "closed" }, { code: "notValidated" },
      { code: "blockers", count: 2 }, { code: "unresolved", count: 1 }, { code: "unresolved", count: 5 },
    ]
    for (const reason of reasons) {
      const text = describeRevisionReason(t, reason)
      assert.ok(text.length > 0 && !/^spooling\./.test(text), reason.code)
      assert.doesNotMatch(text, /\{|\}/, reason.code)
    }
    for (const change of CHANGE_TYPES) assert.ok(t.has(`revision.change.${change}`), change)
    for (const entity of ENGINEERING_ENTITY_TYPES) assert.ok(t.has(`revision.entity.${entity}`), entity)
  })
}

test("a stored issue with a code the app does not know keeps the server's own sentence", () => {
  const t = createTranslator({ locale: "ru", messages: messagesFor("ru"), namespace: "spooling" })
  assert.equal(describeSpoolgenIssue(t, { code: "SRV_WPS_MISSING", columnName: null, message: "No WPS" }), "No WPS")
})

test("file issues name the file and the limit", () => {
  const t = createTranslator({ locale: "ru", messages: messagesFor("ru"), namespace: "spooling" })
  assert.match(describeSpoolgenIssue(t, { code: "FILE_TOO_LARGE", columnName: "trace", message: "FILE_TOO_LARGE" }), /trace\.txt.*4/)
})

test("an issue about one PCF file names that file", () => {
  for (const locale of ["en", "ru"] as const) {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })
    for (const code of ["PCF_UNKNOWN_UNITS", "PCF_NO_WELDS", "PCF_SPOOL_FROM_FILE_NAME", "DUPLICATE_FILE"]) {
      assert.match(describeSpoolgenIssue(t, { code, columnName: null, message: code, fileName: "ISO-1001.pcf" }), /ISO-1001\.pcf/, `${locale} ${code}`)
    }
  }
})

test("the Russian plural of unresolved items counts one, few and many", () => {
  const t = createTranslator({ locale: "ru", messages: messagesFor("ru"), namespace: "spooling" })
  const text = (count: number) => describeRevisionReason(t, { code: "unresolved", count })
  assert.notEqual(text(1), text(2))
  assert.notEqual(text(2), text(5))
})

test("spooling stays a finished Russian namespace", () => {
  assert.ok(RU_COMPLETE_NAMESPACES.includes("spooling"))
})

test("an issue of a whole file shows the file name and not the word sheet", () => {
  for (const locale of ["en", "ru"] as const) {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })
    const where = (fileName: string | null, rowNumber: number | null, columnName: string | null) =>
      describeIssueLocation(t, { fileName, rowNumber, columnName })
    assert.equal(where("ISO-1002.pcf", null, null), "ISO-1002.pcf", locale)
    assert.equal(where("ISO-1002.pcf", null, "spool_number"), "ISO-1002.pcf · spool_number", locale)
    assert.equal(where("weld.csv", 12, "weld_number"), `weld.csv · ${t("issueList.row", { row: 12 })} · weld_number`, locale)
    assert.equal(where(null, null, null), t("issueList.sheet"), locale)
  }
})

test("the import tab is not named after one source and the template hint leaves saving to the person", () => {
  const nav = (locale: "en" | "ru") => createTranslator({ locale, messages: messagesFor(locale), namespace: "nav" })
  assert.equal(nav("ru")("spoolGenImport"), "Импорт")
  assert.equal(nav("en")("spoolGenImport"), "Import")
  for (const locale of ["en", "ru"] as const) {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })
    const hint = t("pcf.mapping.hint")
    assert.ok(hint.includes(t("templates.saveAs")), `${locale}: the hint names the button that saves`)
    assert.doesNotMatch(hint, /saved with the template|сохраняется вместе с шаблоном/, locale)
  }
})

test("every template error code is a sentence the screen can show in both languages", () => {
  for (const locale of ["en", "ru"] as const) {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling.templateErrors" })
    for (const code of IMPORT_TEMPLATE_ERROR_CODES) {
      assert.ok(t.has(code), `${locale} ${code}`)
      assert.doesNotMatch(t(code), /\{|\}/, `${locale} ${code}`)
    }
  }
})

test("the retry button, the replaced-file note and the four-file hint are written in both languages", () => {
  for (const locale of ["en", "ru"] as const) {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })
    assert.ok(t("pcf.retry").length > 0, `${locale} pcf.retry`)
    assert.ok(t.has("templates.codesFailed"), `${locale} templates.codesFailed`)
    const replaced = t("table.replaced", { file: "new.csv", previous: "old.csv" })
    assert.ok(replaced.includes("new.csv") && replaced.includes("old.csv"), `${locale} ${replaced}`)
    assert.ok(t("table.columnsLeftToServer").length > 0, `${locale} table.columnsLeftToServer`)
  }
})

test("a column list of the mapping editor is named after the field it chooses for", () => {
  for (const locale of ["en", "ru"] as const) {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling.mapping" })
    const label = t("chooseColumn", { field: t("fields.weld_number") })
    assert.ok(label.includes(t("fields.weld_number")), `${locale} ${label}`)
  }
})

test("the table hint names the sheet a workbook is read from, the role's own", () => {
  for (const locale of ["en", "ru"] as const) {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })
    const hint = t("table.hint", { limit: 4 })
    for (const role of ["weld", "trace", "bolt", "supp"]) assert.ok(hint.includes(role), `${locale}: ${role}`)
  }
})

test("the Excel panel tells to download the template when the weld sheet or a column is missing", () => {
  for (const locale of ["en", "ru"] as const) {
    const t = createTranslator({ locale, messages: messagesFor(locale), namespace: "spooling" })
    assert.ok(t("excel.noWeldSheet").includes("weld"), locale)
    const missing = t("excel.missingColumns", { sheet: "weld", count: 2, columns: "PDS_AREA, WELD_TYPE" })
    assert.ok(missing.includes("weld") && missing.includes("PDS_AREA, WELD_TYPE"), `${locale}: ${missing}`)
    const hint = t("excel.hint", { limit: 4 })
    for (const role of ["weld", "trace", "bolt", "supp"]) assert.ok(hint.includes(role), `${locale}: ${role}`)
  }
})
