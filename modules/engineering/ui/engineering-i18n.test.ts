import assert from "node:assert/strict"
import test from "node:test"
import { createTranslator } from "next-intl"
import { I18N_DONE_PATHS, RU_COMPLETE_NAMESPACES } from "@/i18n/coverage"
import { messagesFor } from "@/i18n/messages"
import { findUiLiterals } from "@/scripts/i18n/find-ui-literals"
import { CHANGE_TYPES } from "../domain/diff"
import { ENGINEERING_ENTITY_TYPES } from "../domain/entity"
import { SPOOLGEN_ISSUE_CODES } from "../domain/spoolgen-issue"
import type { RevisionApplyReason } from "../application/resolve-revision"
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
