import assert from "node:assert/strict"
import test from "node:test"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import {
  loadMaterialCheckWorkspace,
  searchMaterialTraceCandidates,
} from "./supabase-material-check-repository"

test("loadMaterialCheckWorkspace validates spool revision UUID", async () => {
  const client = {} as SupabaseClient<Database>
  await assert.rejects(
    () => loadMaterialCheckWorkspace(client, "not-a-valid-uuid"),
    /Invalid spool revision ID\./,
  )
})

test("loadMaterialCheckWorkspace loads single page with BOM lines and accepted evidence", async () => {
  const rpcCalls: any[] = []
  const client = {
    rpc: async (fn: string, params: any) => {
      rpcCalls.push({ fn, params })
      if (fn === "read_material_check_workspace") {
        return {
          data: {
            lines: [
              {
                spoolRevisionMaterialId: "50000000-0000-0000-0000-000000000002",
                identCode: "ID-1",
                description: "Second Pipe",
                quantity: 1,
                unit: "ea",
                expectedTraceNumber: "H2",
                accepted: null,
              },
              {
                spoolRevisionMaterialId: "50000000-0000-0000-0000-000000000001",
                identCode: "ID-1",
                description: "First Pipe",
                quantity: 1,
                unit: "ea",
                expectedTraceNumber: "Heat-ab12",
                accepted: {
                  materialCheckItemId: "70000000-0000-0000-0000-000000000001",
                  spoolRevisionMaterialId: "50000000-0000-0000-0000-000000000001",
                  pipingMaterialRecordId: "60000000-0000-0000-0000-000000000001",
                  traceNumber: "Heat-ab12",
                  mrrNumber: "MRR-101",
                  status: "active",
                  quantity: 1,
                },
              },
            ],
            record: {
              id: "80000000-0000-0000-0000-000000000001",
              checkedOn: "2026-10-06",
              qc13Form: {
                id: "90000000-0000-0000-0000-000000000001",
                formNumber: "QC13-001",
                requestedOn: "2026-10-05",
              },
            },
            latestQc13Form: {
              id: "90000000-0000-0000-0000-000000000002",
              formNumber: "QC13-002",
              requestedOn: "2026-10-06",
            },
            hasMore: false,
            nextAfterId: null,
          },
          error: null,
        }
      }
      throw new Error(`Unexpected RPC: ${fn}`)
    },
  } as unknown as SupabaseClient<Database>

  const workspace = await loadMaterialCheckWorkspace(client, "36000000-0000-0000-0000-000000000108")
  assert.equal(rpcCalls.length, 1)
  assert.equal(rpcCalls[0].params.target_spool_revision_id, "36000000-0000-0000-0000-000000000108")
  assert.equal(rpcCalls[0].params.after_id ?? null, null)

  // Two distinct BOM rows with same Ident are not collapsed
  assert.equal(workspace.lines.length, 2)
  // Preserves exact casing
  assert.equal(workspace.lines[0].expectedTraceNumber, "H2")
  assert.equal(workspace.lines[1].expectedTraceNumber, "Heat-ab12")

  // Accepted evidence loaded with source details
  assert.equal(workspace.accepted.length, 1)
  assert.equal(workspace.accepted[0].traceNumber, "Heat-ab12")
  assert.equal(workspace.accepted[0].mrrNumber, "MRR-101")
  assert.equal(workspace.accepted[0].status, "active")

  // Header and latest QC-13
  assert.equal(workspace.record?.id, "80000000-0000-0000-0000-000000000001")
  assert.equal(workspace.record?.qc13Form?.formNumber, "QC13-001")
  assert.equal(workspace.latestQc13Form?.formNumber, "QC13-002")
})

test("loadMaterialCheckWorkspace loads 1001 BOM lines across pagination without truncation", async () => {
  const pages: any[] = []
  // Generate 1001 items across 6 pages (200 items per page, last page 1 item)
  for (let page = 0; page < 6; page++) {
    const pageItems = []
    const startIdx = page * 200
    const count = Math.min(200, 1001 - startIdx)
    for (let i = 0; i < count; i++) {
      const idx = startIdx + i + 1
      const idHex = idx.toString(16).padStart(12, "0")
      pageItems.push({
        spoolRevisionMaterialId: `50000000-0000-0000-0000-${idHex}`,
        identCode: `ID-${idx}`,
        description: `Item ${idx}`,
        quantity: 1,
        unit: "ea",
        expectedTraceNumber: null,
        accepted: null,
      })
    }
    const hasMore = page < 5
    const lastItem = pageItems.at(-1)
    pages.push({
      lines: pageItems,
      record: null,
      latestQc13Form: null,
      hasMore,
      nextAfterId: hasMore ? lastItem?.spoolRevisionMaterialId : null,
    })
  }

  let callIndex = 0
  const client = {
    rpc: async (_fn: string, _params: any) => {
      const pageData = pages[callIndex++]
      return { data: pageData, error: null }
    },
  } as unknown as SupabaseClient<Database>

  const workspace = await loadMaterialCheckWorkspace(client, "36000000-0000-0000-0000-000000000108")
  assert.equal(callIndex, 6)
  assert.equal(workspace.lines.length, 1001)
})

test("loadMaterialCheckWorkspace preserves inactive and null accepted evidence labels", async () => {
  const client = {
    rpc: async () => ({
      data: {
        lines: [
          {
            spoolRevisionMaterialId: "50000000-0000-0000-0000-000000000001",
            identCode: "ID-1",
            description: null,
            quantity: 1,
            unit: null,
            expectedTraceNumber: null,
            accepted: {
              materialCheckItemId: "70000000-0000-0000-0000-000000000001",
              spoolRevisionMaterialId: "50000000-0000-0000-0000-000000000001",
              pipingMaterialRecordId: "60000000-0000-0000-0000-000000000001",
              traceNumber: null,
              mrrNumber: null,
              status: "inactive",
              quantity: null,
            },
          },
        ],
        record: null,
        latestQc13Form: null,
        hasMore: false,
        nextAfterId: null,
      },
      error: null,
    }),
  } as unknown as SupabaseClient<Database>

  const workspace = await loadMaterialCheckWorkspace(client, "36000000-0000-0000-0000-000000000108")
  assert.equal(workspace.accepted.length, 1)
  assert.equal(workspace.accepted[0].status, "inactive")
  assert.equal(workspace.accepted[0].traceNumber, null)
  assert.equal(workspace.accepted[0].mrrNumber, null)
})

test("loadMaterialCheckWorkspace aborts on repeated pagination cursor", async () => {
  const client = {
    rpc: async () => ({
      data: {
        lines: [
          {
            spoolRevisionMaterialId: "50000000-0000-0000-0000-000000000001",
            identCode: "ID-1",
            description: null,
            quantity: 1,
            unit: null,
            expectedTraceNumber: null,
            accepted: null,
          },
        ],
        record: null,
        latestQc13Form: null,
        hasMore: true,
        nextAfterId: "50000000-0000-0000-0000-000000000001", // same cursor repeated
      },
      error: null,
    }),
  } as unknown as SupabaseClient<Database>

  await assert.rejects(
    () => loadMaterialCheckWorkspace(client, "36000000-0000-0000-0000-000000000108"),
    /Invalid pagination cursor received from server\./,
  )
})

test("loadMaterialCheckWorkspace aborts if a subsequent page fails", async () => {
  let callCount = 0
  const client = {
    rpc: async () => {
      callCount++
      if (callCount === 1) {
        return {
          data: {
            lines: [
              {
                spoolRevisionMaterialId: "50000000-0000-0000-0000-000000000001",
                identCode: "ID-1",
                description: null,
                quantity: 1,
                unit: null,
                expectedTraceNumber: null,
                accepted: null,
              },
            ],
            record: null,
            latestQc13Form: null,
            hasMore: true,
            nextAfterId: "50000000-0000-0000-0000-000000000002",
          },
          error: null,
        }
      }
      return {
        data: null,
        error: { code: "42501", message: "permission denied" },
      }
    },
  } as unknown as SupabaseClient<Database>

  await assert.rejects(
    () => loadMaterialCheckWorkspace(client, "36000000-0000-0000-0000-000000000108"),
    /You do not have permission/,
  )
})

test("searchMaterialTraceCandidates passes literal search string without filter injection", async () => {
  let capturedParams: any = null
  const client = {
    rpc: async (fn: string, params: any) => {
      if (fn === "search_material_trace_candidates") {
        capturedParams = params
        return {
          data: [
            {
              id: "60000000-0000-0000-0000-000000000001",
              ident_code: "ID-1",
              trace_number: "Heat-ab12",
              mrr_number: "MRR-101",
              status: "active",
            },
          ],
          error: null,
        }
      }
      throw new Error(`Unexpected RPC: ${fn}`)
    },
  } as unknown as SupabaseClient<Database>

  const trickySearch = "A%,_()'"
  const result = await searchMaterialTraceCandidates(client, {
    spoolRevisionMaterialId: "50000000-0000-0000-0000-000000000001",
    query: trickySearch,
    cursor: { traceNumber: "PrevTrace", id: "60000000-0000-0000-0000-000000000000" },
  })

  assert.equal(capturedParams.target_spool_revision_material_id, "50000000-0000-0000-0000-000000000001")
  assert.equal(capturedParams.search_text, trickySearch)
  assert.equal(capturedParams.after_trace, "PrevTrace")
  assert.equal(capturedParams.after_id, "60000000-0000-0000-0000-000000000000")
  assert.equal(capturedParams.page_size, 25)

  assert.equal(result.options.length, 1)
  assert.equal(result.options[0].traceNumber, "Heat-ab12")
  assert.equal(result.nextCursor, null)
})

test("searchMaterialTraceCandidates returns nextCursor when results exceed page_size", async () => {
  const rows: any[] = []
  for (let i = 1; i <= 26; i++) {
    const hex = i.toString(16).padStart(12, "0")
    rows.push({
      id: `60000000-0000-0000-0000-${hex}`,
      ident_code: "ID-1",
      trace_number: `Trace-${i}`,
      mrr_number: `MRR-${i}`,
      status: "active",
    })
  }

  const client = {
    rpc: async () => ({
      data: rows,
      error: null,
    }),
  } as unknown as SupabaseClient<Database>

  const result = await searchMaterialTraceCandidates(client, {
    spoolRevisionMaterialId: "50000000-0000-0000-0000-000000000001",
  })

  // visible is sliced to requestedPageSize (25)
  assert.equal(result.options.length, 25)
  assert.equal(result.nextCursor?.traceNumber, "Trace-25")
  assert.equal(result.nextCursor?.id, "60000000-0000-0000-0000-000000000019")
})

test("searchMaterialTraceCandidates rejects inactive candidate from server", async () => {
  const client = {
    rpc: async () => ({
      data: [
        {
          id: "60000000-0000-0000-0000-000000000001",
          ident_code: "ID-1",
          trace_number: "Trace-Inactive",
          mrr_number: "MRR-1",
          status: "inactive",
        },
      ],
      error: null,
    }),
  } as unknown as SupabaseClient<Database>

  await assert.rejects(
    () =>
      searchMaterialTraceCandidates(client, {
        spoolRevisionMaterialId: "50000000-0000-0000-0000-000000000001",
      }),
    /Unexpected inactive material candidate\./,
  )
})
