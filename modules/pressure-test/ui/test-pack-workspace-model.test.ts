import assert from "node:assert/strict"
import test from "node:test"
import {
  buildTestPackHref,
  selectTestPackRow,
  targetDraftKey,
  testPackMode,
  testPackOperation,
  testPackView,
  TEST_PACK_VIEWS,
} from "./test-pack-workspace-model"

test("selection never substitutes the first or a foreign pack", () => {
  const rows = [
    { id: "a", projectId: "p1", testPackNumber: "TP-A", revisionNo: 0, lifecycle: "active", activeIsoCount: 2 },
    { id: "b", projectId: "p1", testPackNumber: "TP-B", revisionNo: 1, lifecycle: "active", activeIsoCount: 4 },
  ]
  assert.equal(selectTestPackRow(rows, "p1", null), null)
  assert.equal(selectTestPackRow(rows, "p2", "a"), null)
  assert.equal(selectTestPackRow(rows, "p1", "missing"), null)
  assert.equal(selectTestPackRow(rows, "p1", "a")?.id, "a")
  assert.equal(selectTestPackRow(rows, "p1", "b")?.id, "b")
})

test("links retain project and reject external return paths", () => {
  const href = buildTestPackHref({
    href: "/testpack/builder",
    projectCode: "P A",
    testPackId: "id/1",
    view: "composition",
    from: "//evil.test",
  })
  const url = new URL(href, "http://pipeqc.local")
  assert.equal(url.searchParams.get("p"), "P A")
  assert.equal(url.searchParams.get("testPackId"), "id/1")
  assert.equal(url.searchParams.get("view"), "composition")
  assert.equal(url.searchParams.has("from"), false)
  assert.equal(testPackView("obsolete"), "readiness")
})

test("links can specify operation, mode and spool and keep safe return path", () => {
  const href = buildTestPackHref({
    href: "/testpack/explorer?existing=1&namespace=tp",
    projectCode: "SHOWCASE-1",
    testPackId: "tp-123",
    view: "workflow",
    operation: "line_check",
    mode: "preparation",
    spoolRevisionId: "spool-456",
    from: "/testpack/explorer?p=SHOWCASE-1&testPackId=tp-123",
  })
  const url = new URL(href, "http://pipeqc.local")
  assert.equal(url.searchParams.get("p"), "SHOWCASE-1")
  assert.equal(url.searchParams.get("testPackId"), "tp-123")
  assert.equal(url.searchParams.get("view"), "workflow")
  assert.equal(url.searchParams.get("operation"), "line_check")
  assert.equal(url.searchParams.get("mode"), "preparation")
  assert.equal(url.searchParams.get("spool"), "spool-456")
  assert.equal(url.searchParams.get("from"), "/testpack/explorer?p=SHOWCASE-1&testPackId=tp-123")
  assert.equal(url.searchParams.get("existing"), "1")
})

test("one request cannot share drafts between different ISO targets", () => {
  assert.notEqual(targetDraftKey("req", "iso1"), targetDraftKey("req", "iso2"))
  assert.notEqual(targetDraftKey("req1", "iso"), targetDraftKey("req2", "iso"))
  assert.equal(targetDraftKey("req", "iso"), JSON.stringify(["req", "iso"]))
})

test("test pack views and operations are validated correctly", () => {
  for (const view of TEST_PACK_VIEWS) {
    assert.equal(testPackView(view), view)
  }
  assert.equal(testPackView(null), "readiness")
  assert.equal(testPackView("unknown"), "readiness")

  assert.equal(testPackOperation("line_check"), "line_check")
  assert.equal(testPackOperation("invalid"), null)
  assert.equal(testPackOperation(null), null)

  assert.equal(testPackMode("preparation"), "preparation")
  assert.equal(testPackMode("progress"), "progress")
  assert.equal(testPackMode("invalid"), null)
})
