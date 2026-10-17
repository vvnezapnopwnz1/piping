import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

import { emptyTableState } from "@/components/ui/data-table"
import {
  fabricationSpoolQueryFromTableState,
  type FabricationStageLabelMap,
} from "./fabrication-spool-query"

const stages: FabricationStageLabelMap = {
  NotStarted: null,
  "Start fabrication": "start_fab",
  "QC release": "qc_release",
}

test("fabrication spool query keeps every table filter in server form", () => {
  const query = fabricationSpoolQueryFromTableState(
    {
      ...emptyTableState(),
      search: "iso-220",
      filters: [
        { id: "spoolNumber", kind: "text", value: "SP-17" },
        { id: "currentStage", kind: "select", values: ["NotStarted", "QC release"] },
        { id: "ndePending", kind: "number", min: 1, max: 3 },
        { id: "pwhtPending", kind: "number", min: null, max: 2 },
        { id: "isReleasable", kind: "boolean", value: false },
      ],
      sorting: [{ id: "ndePending", desc: true }],
    },
    stages,
  )

  assert.deepEqual(query, {
    search: "iso-220",
    spoolNumber: "SP-17",
    isoNumber: null,
    stages: [null, "qc_release"],
    ndePending: { min: 1, max: 3 },
    pwhtPending: { min: null, max: 2 },
    isReleasable: false,
    sort: { id: "ndePending", desc: true },
  })
})

test("fabrication spool query ignores stale or unsupported URL values", () => {
  const query = fabricationSpoolQueryFromTableState(
    {
      ...emptyTableState(),
      filters: [
        { id: "currentStage", kind: "select", values: ["old translation"] },
        { id: "unknown", kind: "text", value: "do not pass through" },
      ],
      sorting: [
        { id: "material", desc: false },
        { id: "isoNumber", desc: true },
      ],
    },
    stages,
  )

  assert.equal(query.stages, null)
  assert.deepEqual(query.sort, { id: "isoNumber", desc: true })
})

test("the stage facet is a project catalog, not a page or filter result", () => {
  const source = readFileSync(new URL("./fabrication-overview.tsx", import.meta.url), "utf8")
  assert.match(source, /loadFabricationSpoolStageFacets\(getSupabaseBrowserClient\(\), projectId\)/)
  assert.doesNotMatch(source, /loadFabricationSpoolStageFacets\(getSupabaseBrowserClient\(\), projectId, query\)/)
})

test("fabrication passes the server result total into its paginator", () => {
  const source = readFileSync(new URL("./fabrication-overview.tsx", import.meta.url), "utf8")
  assert.match(source, /setTotalCount\(page\.totalCount\)/)
  assert.match(source, /totalCount,/)
})

test("the fabrication workbench sends its URL filters to the server", () => {
  const source = readFileSync(new URL("./spool-picker.tsx", import.meta.url), "utf8")
  assert.match(source, /useTableUrlState\(\{ namespace: "spool" \}\)/)
  assert.match(source, /fabricationSpoolQueryFromTableState\(tableState, stageLabels\)/)
  assert.match(source, /loadFabricationSpoolPage\(getSupabaseBrowserClient\(\), projectId, cursor, query, pageSize\)/)
  assert.match(source, /tableState=\{tableState\}/)
  assert.match(source, /serverQuery/)
  assert.match(source, /serverFacets=/)
})
