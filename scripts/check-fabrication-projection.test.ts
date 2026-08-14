import assert from "node:assert/strict"

import { compareFabricationProjectionRows } from "./check-fabrication-projection"

const legacy = {
  line_total: 2,
  line_checked: 2,
  weld_total: 1,
  weld_complete: 1,
  support_total: 0,
  support_recorded: 0,
  nde_pending: 0,
  pwht_pending: 0,
  is_fabricated: true,
  is_releasable: true,
}

assert.deepEqual(compareFabricationProjectionRows(legacy, legacy), [])
assert.deepEqual(
  compareFabricationProjectionRows(legacy, { ...legacy, weld_complete: 0 }),
  ["weld_complete"],
)
