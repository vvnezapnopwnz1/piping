import { test } from "node:test"
import assert from "node:assert/strict"
import { tableChrome } from "./table-chrome"

const base = { rowCount: 7, filteredCount: 7, pageSize: 25, page: 0, hasQuery: false, variant: "full" as const }

test("an empty table without a query is only its empty state", () => {
  assert.deepEqual(tableChrome({ ...base, rowCount: 0, filteredCount: 0 }),
    { showToolbar: false, showSearch: false, showViewControls: false, showPager: false, showHeader: false })
})
test("one page needs no pager", () => {
  assert.equal(tableChrome(base).showPager, false)
  assert.equal(tableChrome({ ...base, filteredCount: 30 }).showPager, true)
})
test("compact tables drop view controls and search under 11 rows", () => {
  const c = tableChrome({ ...base, variant: "compact" })
  assert.equal(c.showViewControls, false)
  assert.equal(c.showSearch, false)
  assert.equal(tableChrome({ ...base, variant: "compact", rowCount: 40, filteredCount: 40 }).showSearch, true)
})
test("a filtered empty result keeps the toolbar so the query can be cleared", () => {
  const c = tableChrome({ ...base, filteredCount: 0, hasQuery: true })
  assert.equal(c.showToolbar, true)
  assert.equal(c.showHeader, true)
})
