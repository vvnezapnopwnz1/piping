import assert from "node:assert/strict"
import test from "node:test"
import { decodeText, readSourceFile } from "./spoolgen-file-reader"

assert.deepEqual(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x41])), { text: "A", encoding: "utf-8" })
assert.deepEqual(decodeText(new Uint8Array([0xff, 0xfe, 0x41, 0x00])), { text: "A", encoding: "utf-16le" })
assert.deepEqual(decodeText(new Uint8Array([0xcd, 0xee, 0xec, 0xe5, 0xf0])), { text: "Номер", encoding: "windows-1251" })
assert.equal(decodeText(new TextEncoder().encode("Стык")).encoding, "utf-8")
assert.deepEqual(decodeText(new TextEncoder().encode("Стык")), { text: "Стык", encoding: "utf-8" })
assert.deepEqual(decodeText(new Uint8Array([])), { text: "", encoding: "utf-8" })

test("readSourceFile decodes the bytes of a File and drops the BOM", async () => {
  const file = new File([new Uint8Array([0xef, 0xbb, 0xbf, 0x41, 0x3b, 0x42])], "weld.csv")
  assert.deepEqual(await readSourceFile(file), { text: "A;B", encoding: "utf-8" })
})
