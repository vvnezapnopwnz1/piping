import assert from "node:assert/strict"
import test from "node:test"

import {
  ariaSort,
  decodeTableState,
  emptyTableState,
  encodeTableState,
  isFilterEmpty,
  removeFilter,
  setFilter,
  sortDirection,
  toggleSort,
  type ColumnFilter,
  type DataTableState,
} from "./table-state"
import { describeFilter, matchesFilter, matchesSearch } from "./filter-predicate"

// -------------------------------------------------------------------------------------------
// Sorting. The app shipped with none at all, so the cycle and its ARIA reporting are pinned.
// -------------------------------------------------------------------------------------------

test("a column cycles ascending, descending, then unsorted", () => {
  let sorting = toggleSort([], "weld")
  assert.deepEqual(sorting, [{ id: "weld", desc: false }])

  sorting = toggleSort(sorting, "weld")
  assert.deepEqual(sorting, [{ id: "weld", desc: true }])

  sorting = toggleSort(sorting, "weld")
  assert.deepEqual(sorting, [], "the third click must restore the natural order")
})

test("a plain click replaces the sort and shift-click appends", () => {
  const first = toggleSort([], "area")
  assert.deepEqual(toggleSort(first, "weld"), [{ id: "weld", desc: false }])

  const additive = toggleSort(first, "weld", { additive: true })
  assert.deepEqual(additive, [
    { id: "area", desc: false },
    { id: "weld", desc: false },
  ])
})

test("aria-sort reports the direction only for the sorted column", () => {
  const sorting = [{ id: "weld", desc: true }]
  assert.equal(ariaSort(sorting, "weld"), "descending")
  assert.equal(ariaSort(sorting, "area"), "none")
  assert.equal(sortDirection(sorting, "weld"), "desc")
  assert.equal(sortDirection(sorting, "area"), null)
})

// -------------------------------------------------------------------------------------------
// Filters
// -------------------------------------------------------------------------------------------

test("a filter emptied to nothing is dropped rather than kept as a no-op chip", () => {
  const withFilter = setFilter([], { id: "status", kind: "select", values: ["open"] })
  assert.equal(withFilter.length, 1)

  const emptied = setFilter(withFilter, { id: "status", kind: "select", values: [] })
  assert.deepEqual(emptied, [])
})

test("setting a filter replaces the column's previous one instead of stacking", () => {
  const once = setFilter([], { id: "dia", kind: "number", min: 2, max: null })
  const twice = setFilter(once, { id: "dia", kind: "number", min: 6, max: null })
  assert.equal(twice.length, 1)
  assert.deepEqual(twice[0], { id: "dia", kind: "number", min: 6, max: null })
})

test("removeFilter takes out one column and leaves the rest", () => {
  const filters: ColumnFilter[] = [
    { id: "status", kind: "select", values: ["open"] },
    { id: "area", kind: "text", value: "A-12" },
  ]
  assert.deepEqual(removeFilter(filters, "status"), [{ id: "area", kind: "text", value: "A-12" }])
})

test("a boolean filter is never empty — false is a real choice", () => {
  assert.equal(isFilterEmpty({ id: "locked", kind: "boolean", value: false }), false)
})

// -------------------------------------------------------------------------------------------
// Predicates
// -------------------------------------------------------------------------------------------

test("text filtering is case-insensitive and matches inside the value", () => {
  const filter: ColumnFilter = { id: "iso", kind: "text", value: "sp-1" }
  assert.equal(matchesFilter("ISO-SP-14", filter), true)
  assert.equal(matchesFilter("ISO-XX-99", filter), false)
})

test("a multi-valued cell matches if any of its values was picked", () => {
  const filter: ColumnFilter = { id: "welders", kind: "select", values: ["W-07"] }
  assert.equal(matchesFilter(["W-03", "W-07"], filter), true)
  assert.equal(matchesFilter(["W-03"], filter), false)
})

test("an open-ended range filters only the side that was given", () => {
  const atLeastSix: ColumnFilter = { id: "dia", kind: "number", min: 6, max: null }
  assert.equal(matchesFilter(8, atLeastSix), true)
  assert.equal(matchesFilter(4, atLeastSix), false)

  const until: ColumnFilter = { id: "weldOn", kind: "date", from: null, to: "2026-06-30" }
  assert.equal(matchesFilter("2026-05-02T09:00:00Z", until), true)
  assert.equal(matchesFilter("2026-08-02", until), false)
})

test("the search box looks only at the values it was handed", () => {
  assert.equal(matchesSearch(["ISO-14", "SP-2"], "iso-14"), true)
  assert.equal(matchesSearch(["ISO-14", "SP-2"], "rejected"), false)
  assert.equal(matchesSearch([], "   "), true, "an empty search must not blank the table")
})

test("chips name the column, the operator and the value", () => {
  assert.equal(describeFilter({ id: "s", kind: "text", value: "A-12" }, "Area"), "Area: A-12")
  assert.equal(
    describeFilter({ id: "s", kind: "select", values: ["a", "b", "c"] }, "Status"),
    "Status: 3 selected",
  )
  assert.equal(describeFilter({ id: "d", kind: "number", min: null, max: 6 }, "Dia"), "Dia ≤ 6")
})

// -------------------------------------------------------------------------------------------
// URL round trip. This is what makes a worklist linkable and survivable across the back button.
// -------------------------------------------------------------------------------------------

const roundTrip = (state: DataTableState) =>
  decodeTableState(encodeTableState(state).toString())

test("every part of the state survives the URL", () => {
  const state = emptyTableState({
    search: "SP-14",
    sorting: [
      { id: "area", desc: false },
      { id: "weldOn", desc: true },
    ],
    filters: [
      { id: "status", kind: "select", values: ["open", "rejected"] },
      { id: "dia", kind: "number", min: 2, max: 12 },
      { id: "weldOn", kind: "date", from: "2026-01-01", to: null },
      { id: "locked", kind: "boolean", value: false },
      { id: "remark", kind: "text", value: "re-weld" },
    ],
    pageIndex: 3,
    pageSize: 100,
    density: "compact",
    hidden: ["thk"],
    pinned: ["weld"],
  })

  assert.deepEqual(roundTrip(state), state)
})

test("a pristine table writes nothing, so a bare URL still means the default view", () => {
  assert.equal(encodeTableState(emptyTableState()).toString(), "")
})

test("pages are one-based in the link and zero-based in the state", () => {
  const params = encodeTableState(emptyTableState({ pageIndex: 2 }))
  assert.equal(params.get("page"), "3")
  assert.equal(decodeTableState(params).pageIndex, 2)
})

test("values carrying the separators do not split their own filter", () => {
  const state = emptyTableState({
    filters: [{ id: "code", kind: "select", values: ["A|B", "C~D", "E,F", "G:H"] }],
  })
  assert.deepEqual(roundTrip(state).filters, state.filters)
})

test("a mangled link degrades to a weaker view rather than throwing", () => {
  const decoded = decodeTableState("sort=&f=broken:nonsense:x,status:in:&page=-4&size=abc&d=huge")
  assert.deepEqual(decoded.sorting, [])
  assert.deepEqual(decoded.filters, [])
  assert.equal(decoded.pageIndex, 0)
  assert.equal(decoded.pageSize, emptyTableState().pageSize)
  assert.equal(decoded.density, "default")
})
