import assert from "node:assert/strict"
import test from "node:test"

import { isosOf } from "./builders"
import { UPG_SPEC } from "./dataset"
import { parseTimeImportArgs } from "./time-import-args"

test("--isos resolves to the copies that reach that many ISOs", () => {
  assert.deepEqual(parseTimeImportArgs(["--isos", "1400"]), { copies: Math.ceil(1400 / isosOf(UPG_SPEC).length), perJob: 1 })
  assert.equal(parseTimeImportArgs(["--isos", "1400"]).copies, 35)
})

test("--copies and --per-job keep their meaning", () => {
  assert.deepEqual(parseTimeImportArgs(["--copies", "5", "--per-job", "5"]), { copies: 5, perJob: 5 })
  assert.deepEqual(parseTimeImportArgs([]), { copies: 5, perJob: 1 })
})

test("--isos together with --copies is refused", () => {
  assert.throws(() => parseTimeImportArgs(["--isos", "400", "--copies", "5"]), /either/)
})

test("a bad number is refused", () => {
  assert.throws(() => parseTimeImportArgs(["--isos", "0"]), /--isos/)
  assert.throws(() => parseTimeImportArgs(["--per-job", "x"]), /--per-job/)
})
