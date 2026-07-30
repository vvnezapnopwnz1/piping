import assert from "node:assert/strict"

import { createRequestVersion } from "./request-version"

const requestVersion = createRequestVersion()
const firstRequest = requestVersion.start()
const secondRequest = requestVersion.start()

assert.equal(firstRequest.isCurrent(), false)
assert.equal(secondRequest.isCurrent(), true)

requestVersion.invalidate()
assert.equal(secondRequest.isCurrent(), false)

console.log("All request-version assertions passed.")
