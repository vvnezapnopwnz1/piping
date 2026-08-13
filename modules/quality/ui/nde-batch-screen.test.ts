import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("./nde-batch-screen.tsx", import.meta.url), "utf8")

// Item 14: "Allocate Candidates" committed a durable, server-chosen selection with nothing shown
// beforehand. The preview RPC already existed and was simply never called from the UI.
test("allocation is previewed before it commits", () => {
  assert.ok(source.includes("previewNdeBatchCandidates"), "the screen must read the candidate set")
  assert.ok(
    source.includes("openAllocationPreview"),
    "the Allocate Candidates button must open a preview rather than allocating directly",
  )
  assert.ok(
    /onClick=\{\(\) => void openAllocationPreview\(b\.id\)\}/.test(source),
    "the batch row button must route through the preview",
  )
  assert.equal(
    /onClick=\{\(\) => void handleAllocateCandidates\(b\.id\)\}/.test(source),
    false,
    "no row may allocate straight from the table",
  )
})

test("the allocation toast reports the count the RPC actually returned", () => {
  assert.ok(
    source.includes("const allocated = await allocateNdeBatchCandidates("),
    "the screen must keep the allocated count",
  )
  assert.ok(
    /\$\{allocated\} candidate/.test(source),
    "the success toast must name the real allocated count, not a fixed string",
  )
})

test("the allocation commit is guarded against double submission", () => {
  assert.ok(/if \(!previewBatchId \|\| allocating\) return/.test(source), "re-entry must be refused")
  assert.ok(/finally \{\s*setAllocating\(false\)/.test(source), "the flag must clear on failure too")
})

// Item 15: the two tables had no cross-reference in either direction.
test("batches and obligations cross-reference each other", () => {
  assert.ok(
    source.includes("loadNdeBatchObligationCounts"),
    "the Batches table must know how many obligations each batch holds",
  )
  assert.ok(
    source.includes("obligationCounts[b.id] ?? 0"),
    "each batch row must render its obligation count",
  )
  assert.ok(
    /id: "batchNumber",[\s\S]{0,120}value: \(ob\) => ob\.batchNumber/.test(source),
    "each obligation row must render its allocating batch (the table draws a dash when it is null)",
  )
})

// A column added to a table whose empty state spans a hardcoded colSpan silently misaligns it.
// The Batches table still writes its own markup and so still needs the literal checked; the
// Obligations table is a DataTable, which spans whatever columns are visible — including after
// the operator hides one — so a literal there would be the bug rather than the guard.
test("empty states span their tables however wide they are", () => {
  assert.ok(source.includes("colSpan={7}"), "the Batches empty state must span its 7 columns")
  assert.equal(
    /colSpan=\{9\}/.test(source),
    false,
    "the Obligations empty state must not pin a column count the operator can change",
  )
  assert.ok(
    source.includes("<DataTable"),
    "the Obligations table must be a DataTable, which computes its own empty-state span",
  )
})
