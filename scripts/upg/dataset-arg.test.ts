import assert from "node:assert/strict"
import test from "node:test"

import { UPG_SPEC } from "./dataset"
import { specFromArgv } from "./dataset-arg"

test("default is UPG_SPEC", () => {
  assert.equal(specFromArgv(["node", "x"]), UPG_SPEC)
})

test("explicit upg selects UPG_SPEC", () => {
  assert.equal(specFromArgv(["--dataset", "upg"]), UPG_SPEC)
})

test("nps throws not described yet", () => {
  assert.throws(() => specFromArgv(["--dataset", "nps"]), /ещё не описан/)
})

test("unknown dataset is refused", () => {
  assert.throws(() => specFromArgv(["--dataset", "unknown"]), /upg\|nps/)
})

test("flag without value is refused", () => {
  assert.throws(() => specFromArgv(["--dataset"]), /--dataset/)
})

test("an inherited object key is not a dataset", () => {
  assert.throws(() => specFromArgv(["--dataset", "constructor"]), /upg\|nps/)
})
