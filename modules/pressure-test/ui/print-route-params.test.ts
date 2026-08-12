import assert from "node:assert/strict"
import test from "node:test"
import { resolvePrintRequestId } from "./print-route-params"

test("resolves the asynchronous App Router request ID", async () => {
  await assert.doesNotReject(async () => {
    assert.equal(await resolvePrintRequestId(Promise.resolve({ requestId: "request-123" })), "request-123")
  })
})
