import assert from "node:assert/strict"

import { getVisibleNavigation } from "./navigation"

const visibleItems = getVisibleNavigation(() => true)
  .flatMap((section) => section.items)

assert.equal(
  visibleItems.some((item) => item.href === "/reports"),
  true,
  "the implemented Reports route must appear for a user with reports.view",
)

const noReportsItems = getVisibleNavigation((capability) => capability !== "reports.view")
  .flatMap((section) => section.items)

assert.equal(
  noReportsItems.some((item) => item.href === "/reports"),
  false,
  "Reports remains hidden when the user lacks reports.view",
)
