import assert from "node:assert/strict"
import test from "node:test"

import { resolveLocale } from "./locale"

test("a saved choice wins over the browser", () => {
  assert.equal(resolveLocale("en", "ru-RU,ru;q=0.9"), "en")
  assert.equal(resolveLocale("ru", "en-US,en;q=0.9"), "ru")
})

test("Russian and Kazakh browsers get Russian", () => {
  assert.equal(resolveLocale(undefined, "ru-RU,ru;q=0.9,en;q=0.8"), "ru")
  assert.equal(resolveLocale(undefined, "kk-KZ,kk;q=0.9"), "ru")
})

test("the first supported language in the header decides", () => {
  assert.equal(resolveLocale(undefined, "de-DE,en;q=0.8,ru;q=0.5"), "en")
})

test("English, unknown or missing headers get English", () => {
  assert.equal(resolveLocale(undefined, "en-US,en;q=0.9"), "en")
  assert.equal(resolveLocale(undefined, "de-DE"), "en")
  assert.equal(resolveLocale(undefined, null), "en")
})

test("an unknown saved value is ignored", () => {
  assert.equal(resolveLocale("fr", "ru"), "ru")
})
