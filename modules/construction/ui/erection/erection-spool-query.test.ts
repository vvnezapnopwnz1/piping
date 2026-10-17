import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

import { emptyTableState } from "@/components/ui/data-table"
import { erectionSpoolQueryFromTableState, type ErectionStageLabelMap } from "./erection-spool-query"

const stages: ErectionStageLabelMap = {
  "Not started": null,
  "Welded / Bolted": "welded_bolted",
  "Ready for Test": "rft",
}

test("the erection query turns every table filter into its server form", () => {
  const query = erectionSpoolQueryFromTableState(
    {
      ...emptyTableState(),
      search: "iso-3",
      filters: [
        { id: "isoNumber", kind: "text", value: " 3001 " },
        { id: "stage", kind: "select", values: ["Not started", "Ready for Test"] },
        { id: "ndePending", kind: "number", min: 1, max: null },
        { id: "toSiteOn", kind: "date", from: "2026-09-01", to: null },
        { id: "isRft", kind: "boolean", value: true },
      ],
      sorting: [{ id: "pwhtPending", desc: true }],
    },
    stages,
    "rev-9",
  )

  assert.deepEqual(query, {
    search: "iso-3",
    spoolNumber: null,
    isoNumber: "3001",
    spoolRevisionId: "rev-9",
    stages: [null, "rft"],
    ndePending: { min: 1, max: null },
    pwhtPending: null,
    toSiteOn: { from: "2026-09-01", to: null },
    isRft: true,
    sort: { id: "pwhtPending", desc: true },
  })
})

test("stale stage labels and columns the server cannot order are dropped", () => {
  const query = erectionSpoolQueryFromTableState(
    {
      ...emptyTableState(),
      filters: [
        { id: "stage", kind: "select", values: ["a label from another language"] },
        { id: "unknown", kind: "text", value: "do not pass through" },
      ],
      sorting: [
        { id: "fieldWelds", desc: false },
        { id: "isoNumber", desc: true },
      ],
    },
    stages,
  )

  assert.equal(query.stages, null)
  assert.equal(query.isoNumber, null)
  assert.deepEqual(query.sort, { id: "isoNumber", desc: true })
})

const source = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8")

test("the erection screens no longer read the whole project into the browser", () => {
  const hook = source("./use-erection-readiness.ts")
  assert.match(hook, /loadErectionReadiness\(/)
  assert.doesNotMatch(hook, /loadErectionReadinessForProject|selectAllRows/)
  for (const file of ["./field-spool-picker.tsx", "./erection-readiness-screen.tsx"]) {
    assert.match(source(file), /loadErectionSpoolPage\(/, file)
    assert.match(source(file), /loadErectionSpoolStageFacets\(getSupabaseBrowserClient\(\), projectId\)/, file)
    assert.match(source(file), /serverQuery/, file)
  }
})
