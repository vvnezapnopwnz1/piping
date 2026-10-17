import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import test from "node:test"
import { createTranslator } from "next-intl"
import { I18N_DONE_PATHS, RU_COMPLETE_NAMESPACES } from "@/i18n/coverage"
import { messagesFor } from "@/i18n/messages"
import { findUiLiterals, findUiLiteralsInSource } from "@/scripts/i18n/find-ui-literals"
import { normalizeTestPackInput } from "../domain/test-pack"
import { normalizePunchItemInput } from "../domain/punch-item"
import { testPackValidationMessages } from "./test-pack-i18n"
import { TEST_PACK_PRIORITIES, TEST_PACK_MEDIA, missingRequiredFields } from "./test-pack-builder-model"
import { getPressureTestRequestConfig, pressureTestRequestTypes } from "./pressure-test-ui-model"

const paths = ["modules/pressure-test/ui", "modules/pressure-test/application", "modules/pressure-test/domain", "app/testpack"]

test("test-pack screens, commands and domain are in Russian coverage", () => {
  for (const path of paths) assert.ok(I18N_DONE_PATHS.includes(path), path)
  assert.ok(RU_COMPLETE_NAMESPACES.includes("testPack" as typeof RU_COMPLETE_NAMESPACES[number]))
  assert.deepEqual(findUiLiterals(paths), [])
})

test("table empty states and drawer navigation labels also use translations", () => {
  const attrs = /\b(kicker|meta|returnLabel|closeLabel|searchPlaceholder|emptyTitle|emptyDescription|changeLabel|confirmLabel)=/g
  const found = readdirSync("modules/pressure-test/ui").filter((file) => file.endsWith(".tsx")).flatMap((file) => {
    const path = `modules/pressure-test/ui/${file}`
    return findUiLiteralsInSource(path, readFileSync(path, "utf8").replace(attrs, "label="))
  })
  assert.deepEqual(found, [])
})

test("Russian test-pack messages are registered and print forms load translations on the server", () => {
  const messages = messagesFor("ru")
  assert.ok("testPack" in messages)
  const t = createTranslator({ locale: "ru", messages })
  assert.equal(t("testPack.print.blinding" as Parameters<typeof t>[0]), "Форма установки заглушек")
  for (const type of ["blinding", "item-clearance", "line-check", "reinstatement"]) {
    const source = readFileSync(`app/testpack/print/${type}/[requestId]/page.tsx`, "utf8")
    assert.match(source, /await getTranslations\(["']testPack\.print["']\)/)
  }
})

test("test-pack and punch validators return locale-independent reason codes", () => {
  const pack = normalizeTestPackInput({ testPackNumber: "", location: "", priority: "", medium: "?", pressure: 0, plannedStartOn: "", plannedEndOn: "", systemId: "", subsystemId: "", serviceClassId: "", lineServiceId: "", isoIds: [] })
  assert.equal(pack.ok, false)
  assert.equal(pack.errors.testPackNumber, "required")
  assert.equal(pack.errors.medium, "invalidMedium")
  const punch = normalizePunchItemInput({ testPackId: "", isometricId: "", punchCodeId: "", description: "", checkingDate: "" })
  assert.equal(punch.ok, false)
  assert.equal(punch.errors.description, "required")
  assert.equal(punch.errors.checkingDate, "invalidCheckingDate")
})

test("model labels and validation reasons resolve in both locales while persisted values remain stable", () => {
  assert.deepEqual(TEST_PACK_PRIORITIES, ["Low", "Normal", "High", "Critical"])
  assert.deepEqual(TEST_PACK_MEDIA.map((medium) => medium.value), ["H", "P", "V"])
  for (const locale of ["en", "ru"] as const) {
    const translate = createTranslator({ locale, messages: messagesFor(locale), namespace: "testPack" })
    for (const label of [...missingRequiredFields({}), ...TEST_PACK_MEDIA.map((medium) => medium.label)]) {
      assert.ok(translate.has(label as Parameters<typeof translate>[0]), label)
    }
    for (const type of pressureTestRequestTypes) {
      const config = getPressureTestRequestConfig(type)
      assert.ok(translate.has(config.title as Parameters<typeof translate>[0]), config.title)
      assert.ok(translate.has(config.description as Parameters<typeof translate>[0]), config.description)
    }
    const t = (key: string, values?: Parameters<typeof translate>[1]) => translate(key as Parameters<typeof translate>[0], values)
    const message = testPackValidationMessages({ testPackNumber: "required", medium: "invalidMedium" }, t)
    assert.equal(message, locale === "ru" ? "Обязательное поле: Номер тест-пакета; Вид испытания должен быть H, P или V" : "Test Pack number is required; Test medium must be H, P, or V")
  }
})

test("print request and Test Pack counters use complete translated messages", () => {
  const print = readFileSync("modules/pressure-test/ui/request-print-view.tsx", "utf8")
  assert.match(print, /t\("text\.targets", \{ count:/)
  assert.doesNotMatch(print, /codes\.teamType\.\$\{request\.request_type/)
  assert.match(print, /item_clearance: "text\.itemClearance"/)

  const sourceFor = (name: string) => readFileSync(`modules/pressure-test/ui/${name}`, "utf8")
  assert.match(sourceFor("test-pack-composition-editor.tsx"), /header: t\("text\.actions"\)/)
  assert.match(sourceFor("test-pack-list.tsx"), /t\("screen\.isoCount", \{ count:/)
  assert.match(sourceFor("steps/readiness-step.tsx"), /t\("steps\.spoolPending", \{ nde:/)
  assert.match(sourceFor("test-pack-definition-editor.tsx"), /t\("text\.revisionInline", \{ revision:/)
  assert.match(sourceFor("test-pack-definition-editor.tsx"), /\{t\(label\)\}/)
})

test("Test Pack lifecycle badges translate stored status codes exactly once", () => {
  const definition = readFileSync("modules/pressure-test/ui/test-pack-definition-editor.tsx", "utf8")
  assert.match(definition, /t\(`codes\.status\.\$\{pack\.lifecycle\}`\)/)
})
