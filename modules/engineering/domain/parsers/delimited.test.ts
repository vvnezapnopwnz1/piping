import assert from "node:assert/strict"
import { detectDelimiter, parseDelimited } from "./delimited"

assert.equal(detectDelimiter("A\tB\tC"), "\t")
assert.equal(detectDelimiter("A,B,C"), ",")
assert.equal(detectDelimiter("A\tB,C"), "\t")
assert.deepEqual(parseDelimited("A\tB\r\n1\t2\r\n\r\n3\t4\n"), [["A", "B"], ["1", "2"], ["3", "4"]])
assert.deepEqual(parseDelimited("\uFEFFISO\tREV\n X \t Y \n"), [["ISO", "REV"], ["X", "Y"]])
assert.deepEqual(parseDelimited("   \n\n"), [])
