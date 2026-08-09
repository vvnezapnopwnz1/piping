import assert from "node:assert/strict"
import test from "node:test"
import { trackingCapacityLabel } from "../domain/tracking"

test("dashboard labels legacy null capacity without inventing a value", () => {
  assert.equal(trackingCapacityLabel(null), "Not configured")
  assert.equal(trackingCapacityLabel(25), "25")
})
