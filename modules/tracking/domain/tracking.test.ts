import assert from "node:assert/strict"
import { normalizeTrackingDirection, trackingCapacityLabel } from "./tracking"

assert.equal(normalizeTrackingDirection("IN"), "in")
assert.equal(normalizeTrackingDirection("sideways"), null)
assert.equal(trackingCapacityLabel(null), "Not configured")
assert.equal(trackingCapacityLabel(25), "25")
