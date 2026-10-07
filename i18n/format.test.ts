import assert from "node:assert/strict"
import test from "node:test"

import { errorDetail, formatMoment, formatWeekLabel } from "./format"

test("week labels follow the language and keep the calendar day", () => {
  assert.equal(formatWeekLabel("2026-08-24", "en"), "Aug 24")
  assert.equal(formatWeekLabel("2026-08-24", "ru"), "24 авг.")
})

test("moments are written the local way", () => {
  assert.match(formatMoment("2026-08-24T09:05:00Z", "ru"), /^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/)
  assert.match(formatMoment("2026-08-24T09:05:00Z", "en"), /^\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2}\s[AP]M$/)
})

test("the server's own words are shown only when there are some", () => {
  assert.equal(errorDetail(new Error("A release date is required")), "A release date is required")
  assert.equal(errorDetail({ message: "duplicate key" }), "duplicate key")
  assert.equal(errorDetail(new Error("  ")), undefined)
  assert.equal(errorDetail("boom"), undefined)
  assert.equal(errorDetail(null), undefined)
})
