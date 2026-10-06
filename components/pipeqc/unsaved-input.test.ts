import assert from "node:assert/strict"
import test from "node:test"

import { isCommitLabel, isTrackedField, type FieldLike } from "./unsaved-input"

const field = (overrides: Partial<FieldLike> & { attributes?: Record<string, string>; inFilter?: boolean } = {}): FieldLike => ({
  tagName: "INPUT",
  type: "text",
  closest: (selector) => (selector === "[data-filter-control]" && overrides.inFilter ? {} : null),
  getAttribute: (name) => overrides.attributes?.[name] ?? null,
  ...overrides,
})

test("record fields are protected, list narrowing is not", () => {
  assert.equal(isTrackedField(field()), true)
  assert.equal(isTrackedField(field({ tagName: "TEXTAREA", type: undefined })), true)
  assert.equal(isTrackedField(field({ type: "search" })), false)
  assert.equal(isTrackedField(field({ inFilter: true })), false)
  assert.equal(isTrackedField(field({ attributes: { "aria-label": "Filter Test Packs" } })), false)
  assert.equal(isTrackedField(field({ attributes: { placeholder: "Search projects, owners or contracts…" } })), false)
  assert.equal(isTrackedField(field({ attributes: { placeholder: "Heat number from the QC-13" } })), true)
  assert.equal(isTrackedField(field({ disabled: true })), false)
  assert.equal(isTrackedField(field({ readOnly: true })), false)
})

test("only committing commands take typed input as recorded", () => {
  assert.equal(isCommitLabel("Record traces"), true)
  assert.equal(isCommitLabel("  Record Result"), true)
  assert.equal(isCommitLabel("Issue QC-13"), true)
  assert.equal(isCommitLabel("Change spool"), false)
  assert.equal(isCommitLabel("Clear the search"), false)
  assert.equal(isCommitLabel("Recorder"), false)
})
