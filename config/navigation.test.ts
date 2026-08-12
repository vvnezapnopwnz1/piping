import assert from "node:assert/strict"

import { getVisibleNavigation, type NavItem } from "./navigation"

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

// `NavTreeItem` (components/pipeqc/sidebar-nav.tsx) renders any item carrying children as a
// CollapsibleTrigger — a button that only opens the submenu — and only childless leaves as a
// <Link>. So an href is reachable from the sidebar only when it appears on a leaf somewhere in
// the tree; a branch node's own href is never navigable.
const leafHrefs = (items: NavItem[]): string[] =>
  items.flatMap((item) =>
    item.children && item.children.length > 0 ? leafHrefs(item.children) : [item.href],
  )

const reachableHrefs = leafHrefs(getVisibleNavigation(() => true).flatMap((section) => section.items))

assert.equal(
  reachableHrefs.includes("/testpack"),
  true,
  "the Test Pack overview must be reachable from the sidebar, not only its three sub-routes",
)

for (const href of ["/testpack/builder", "/testpack/explorer", "/testpack/pressure-test"]) {
  assert.equal(reachableHrefs.includes(href), true, `${href} must stay reachable from the sidebar`)
}
