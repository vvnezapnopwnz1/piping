import assert from "node:assert/strict"
import test from "node:test"

import { RU_COMPLETE_NAMESPACES } from "./coverage"
import { BANNED_RU_TERMS, SAME_IN_BOTH } from "./glossary"
import { en, mergeMessages, messagesFor, ru, type MessageTree } from "./messages"

test("Russian falls back to English key by key", () => {
  assert.deepEqual(mergeMessages({ a: "A", b: { c: "C", d: "D" } }, { b: { c: "В" } }), { a: "A", b: { c: "В", d: "D" } })
})

test("a stray or wrongly shaped Russian key never replaces English", () => {
  assert.deepEqual(mergeMessages({ a: "A", b: { c: "C" } }, { a: { x: "X" }, b: "B", z: "Z" }), { a: "A", b: { c: "C" } })
})

test("English messages are served as they are", () => {
  assert.equal(messagesFor("en"), en)
})

function flatten(tree: MessageTree, prefix = ""): Map<string, string> {
  const flat = new Map<string, string>()
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === "string") flat.set(path, value)
    else for (const [nested, text] of flatten(value, path)) flat.set(nested, text)
  }
  return flat
}

const EN = flatten(en as unknown as MessageTree)
const RU = flatten(ru as MessageTree)

/** Argument names, with plural/select branch bodies first opened so `other {welds}` is not one. */
function argumentsOf(message: string): string[] {
  const opened = message.replace(/\b(zero|one|two|few|many|other|=\d+)\s*\{/g, "(")
  return [...new Set([...opened.matchAll(/\{\s*([A-Za-z0-9_]+)\s*[,}]/g)].map((match) => match[1]))].sort()
}

const tagsOf = (message: string) => [...new Set([...message.matchAll(/<(\w+)>/g)].map((match) => match[1]))].sort()

test("every Russian key exists in English", () => {
  assert.deepEqual([...RU.keys()].filter((key) => !EN.has(key)), [])
})

test("finished namespaces have every English key in Russian", () => {
  for (const namespace of RU_COMPLETE_NAMESPACES) {
    const missing = [...EN.keys()].filter((key) => key.startsWith(`${namespace}.`) && !RU.has(key))
    assert.deepEqual(missing, [], namespace)
  }
})

test("Russian messages take the same arguments and tags as English", () => {
  for (const [key, message] of RU) {
    const source = EN.get(key) ?? ""
    assert.deepEqual(argumentsOf(message), argumentsOf(source), key)
    assert.deepEqual(tagsOf(message), tagsOf(source), key)
  }
})

test("Russian plurals have one, few, many and other", () => {
  for (const [key, message] of RU) {
    if (!/,\s*plural\s*,/.test(EN.get(key) ?? "")) continue
    for (const branch of ["one", "few", "many", "other"]) {
      assert.match(message, new RegExp(`(^|[\\s}])${branch}\\s*\\{`), `${key}: ${branch}`)
    }
  }
})

test("no Russian message is left in English", () => {
  const copies = [...RU]
    .filter(([key, message]) => message === EN.get(key) && /[a-z]/.test(message) && !SAME_IN_BOTH.has(message))
    .map(([key]) => key)
  assert.deepEqual(copies, [])
})

test("Russian messages use the glossary terms", () => {
  for (const [key, message] of RU) {
    for (const { pattern, use } of BANNED_RU_TERMS) assert.doesNotMatch(message, pattern, `${key}: use «${use}»`)
  }
})
