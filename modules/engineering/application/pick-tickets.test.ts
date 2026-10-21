import assert from "node:assert/strict"
import test from "node:test"
import { createPickTickets } from "./pick-tickets"

test("only the newest pick of a role is current, so a slower earlier read never lands after it", () => {
  const tickets = createPickTickets<"weld" | "trace">()
  const first = tickets.issue("weld")
  const second = tickets.issue("weld")
  const trace = tickets.issue("trace")
  assert.equal(tickets.isCurrent("weld", first), false)
  assert.equal(tickets.isCurrent("weld", second), true)
  assert.equal(tickets.isCurrent("trace", trace), true, "a pick of another role leaves this one current")
})

test("a read of a removed file is no longer current", () => {
  const tickets = createPickTickets<"weld">()
  const ticket = tickets.issue("weld")
  tickets.cancel("weld")
  assert.equal(tickets.isCurrent("weld", ticket), false)
})

test("a ticket of one role is never current for another", () => {
  const tickets = createPickTickets<"weld" | "trace">()
  const weld = tickets.issue("weld")
  assert.equal(tickets.isCurrent("trace", weld), false)
})
