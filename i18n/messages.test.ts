import assert from "node:assert/strict"
import test from "node:test"

import { en, mergeMessages, messagesFor } from "./messages"

test("Russian falls back to English key by key", () => {
  assert.deepEqual(mergeMessages({ a: "A", b: { c: "C", d: "D" } }, { b: { c: "В" } }), { a: "A", b: { c: "В", d: "D" } })
})

test("a stray or wrongly shaped Russian key never replaces English", () => {
  assert.deepEqual(mergeMessages({ a: "A", b: { c: "C" } }, { a: { x: "X" }, b: "B", z: "Z" }), { a: "A", b: { c: "C" } })
})

test("English messages are served as they are", () => {
  assert.equal(messagesFor("en"), en)
})
