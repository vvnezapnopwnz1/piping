import assert from "node:assert/strict"
import test from "node:test"

import { NPS_SPEC } from "../nps/dataset"
import { UPG_SPEC } from "./dataset"
import { specFromArgv } from "./dataset-arg"

test("default is UPG_SPEC", () => {
  assert.equal(specFromArgv(["node", "x"]), UPG_SPEC)
})

test("explicit upg selects UPG_SPEC", () => {
  assert.equal(specFromArgv(["--dataset", "upg"]), UPG_SPEC)
})

test("explicit nps selects NPS_SPEC", () => {
  assert.equal(specFromArgv(["--dataset", "nps"]), NPS_SPEC)
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
