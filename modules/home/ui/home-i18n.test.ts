import assert from "node:assert/strict"
import test from "node:test"
import { createTranslator } from "next-intl"

import { I18N_DONE_PATHS, RU_COMPLETE_NAMESPACES } from "@/i18n/coverage"
import { en, messagesFor, ru } from "@/i18n/messages"
import { findUiLiterals } from "@/scripts/i18n/find-ui-literals"
import { describeAttention } from "./attention-text"
import { attentionItems } from "./home-control-room-model"

const paths = ["modules/home/ui", "modules/home/domain", "app/page.tsx"]

test("home is in Russian coverage and carries no hard-coded English", () => {
  for (const path of paths) assert.ok(I18N_DONE_PATHS.includes(path), path)
  assert.ok(RU_COMPLETE_NAMESPACES.includes("home"))
  assert.deepEqual(findUiLiterals(paths), [])
})

test("the home namespace is registered in both languages", () => {
  assert.ok(Object.keys(en.home).length > 0)
  assert.ok(Object.keys(ru.home ?? {}).length > 0)
})

test("the overview without a project reads in both languages", () => {
  const home = (locale: "en" | "ru") => createTranslator({ locale, messages: messagesFor(locale), namespace: "home" })
  assert.equal(home("en")("noProject"), "Select a project to see its process, live figures and open work.")
  assert.equal(home("ru")("title"), "Состояние проекта")
  assert.match(home("ru")("status.loading", { subject: home("ru")("subject.erection") }), /Монтаж/)
  assert.equal(home("ru")("figure.of", { total: 12 }), "из 12")
})

const FACTS = { nde: { issued: 1 }, erection: { remaining: 3, total: 4 }, testPacks: { blocked: 2, total: 2 } }

test("attention rows are sentences built from codes and counts in English", () => {
  const t = createTranslator({ locale: "en", messages: messagesFor("en"), namespace: "home" })
  const [nde, erection, packs] = attentionItems(FACTS).map((item) => describeAttention(t, item))
  assert.equal(nde.title, "1 NDE obligation awaiting a result")
  assert.equal(erection.title, "3 of 4 spools not Ready for Test")
  assert.equal(packs.title, "2 of 2 test packs not Ready for Test")
})

test("attention rows pluralise in Russian", () => {
  const t = createTranslator({ locale: "ru", messages: messagesFor("ru"), namespace: "home" })
  const titles = (n: number) => describeAttention(t, attentionItems({ nde: { issued: n } })[0]).title
  assert.match(titles(1), /^1 обязательство NDE/)
  assert.match(titles(2), /^2 обязательства NDE/)
  assert.match(titles(5), /^5 обязательств NDE/)
  for (const item of attentionItems(FACTS)) {
    const text = describeAttention(t, item)
    for (const part of Object.values(text)) assert.ok(part.length > 0 && !/\{|\}|^home\./.test(part), item.id)
  }
})
