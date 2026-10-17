import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const directory = fileURLToPath(new URL("./", import.meta.url))
const table = readFileSync(directory + "data-table.tsx", "utf8")
const header = readFileSync(directory + "data-table-column-header.tsx", "utf8")
const editor = readFileSync(directory + "column-filter-editor.tsx", "utf8")
const recordSelect = readFileSync(directory + "record-select-table.tsx", "utf8")
const urlState = readFileSync(directory + "use-table-url-state.ts", "utf8")

test("a column filter always writes the stable column id, not its translated label", () => {
  assert.match(table, /columnId=\{column\.id\}/)
  assert.match(header, /columnId=\{columnId\}/)
  assert.doesNotMatch(header, /columnId=\{filter\?\.id \?\? label\}/)
})

test("a non-sortable column retains its filter affordance", () => {
  assert.match(table, /sortable=\{column\.sortable !== false\}/)
  assert.doesNotMatch(table, /column\.sortable === false \? \(\s*column\.header/)
})

test("a screen can hide a facet count beside a selected option", () => {
  assert.match(table, /hideSelectedFacetCounts/)
  assert.match(header, /hideSelectedOptionCounts=\{hideSelectedFacetCounts\}/)
  assert.match(editor, /hideSelectedOptionCounts/)
})

test("server pagination displays the result range, total and page count", () => {
  assert.match(table, /totalCount: number/)
  assert.match(table, /tt\('range'/)
  assert.match(table, /tt\('pageOf'/)
  assert.doesNotMatch(table, /serverPagination[\s\S]*?tt\('rowsInPage'/)
})

test("a server-backed record selector can control table state and query behavior", () => {
  assert.match(recordSelect, /tableState\?: DataTableState/)
  assert.match(recordSelect, /onTableStateChange\?: \(next: DataTableState\) => void/)
  assert.match(recordSelect, /serverQuery\?: boolean/)
  assert.match(recordSelect, /serverFacets\?:/)
})

test("URL navigation is not triggered from inside a React state updater", () => {
  assert.match(urlState, /stateRef\.current/)
  assert.doesNotMatch(urlState, /setState\(\(current\) => \{[\s\S]*?router\.replace/)
})
