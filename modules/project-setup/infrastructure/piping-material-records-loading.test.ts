import assert from "node:assert/strict"
import test from "node:test"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import { loadPipingMaterialRecordRows } from "./supabase-welding-quality-reference-repository"

function createMockPmlClient(handler: (params: {
  projectId: string
  identCode?: string
  afterId?: string
  limit: number
}) => { data: any[] | null; error: any | null }) {
  const client = {
    from: (table: string) => {
      assert.equal(table, "piping_material_records")
      return {
        select: (_cols: string) => {
          let currentProjectId = ""
          let currentIdentCode: string | undefined
          let currentAfterId: string | undefined
          let currentLimit = 200

          const builder: any = {
            eq: (col: string, val: string) => {
              if (col === "project_id") currentProjectId = val
              if (col === "ident_code") currentIdentCode = val
              return builder
            },
            gt: (col: string, val: string) => {
              if (col === "id") currentAfterId = val
              return builder
            },
            order: (_col: string) => builder,
            limit: (val: number) => {
              currentLimit = val
              return builder
            },
            then: (resolve: (res: any) => void, reject?: (err: any) => void) => {
              try {
                const res = handler({
                  projectId: currentProjectId,
                  identCode: currentIdentCode,
                  afterId: currentAfterId,
                  limit: currentLimit,
                })
                resolve(res)
              } catch (err) {
                if (reject) reject(err)
                else throw err
              }
            },
          }
          return builder
        },
      }
    },
  } as unknown as SupabaseClient<Database>

  return client
}

test("loadPipingMaterialRecordRows paginates across multiple pages (>1000 items)", async () => {
  // Generate 500 records across 3 pages (page size 200: 200, 200, 100)
  const totalCount = 500
  const allRecords = Array.from({ length: totalCount }, (_, i) => ({
    id: `pml-${String(i + 1).padStart(6, "0")}`,
    project_id: "proj-1",
    mrr_number: `MRR-${Math.floor(i / 10)}`,
    ident_code: `IDN-${i % 20}`,
    trace_number: `HEAT-${i}`,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  const recordedCalls: any[] = []

  const client = createMockPmlClient(({ projectId, identCode, afterId, limit }) => {
    recordedCalls.push({ projectId, identCode, afterId, limit })
    let matching = allRecords.filter((r) => r.project_id === projectId)
    if (identCode) {
      matching = matching.filter((r) => r.ident_code === identCode)
    }
    if (afterId) {
      matching = matching.filter((r) => r.id > afterId)
    }
    const page = matching.slice(0, limit)
    return { data: page, error: null }
  })

  const results = await loadPipingMaterialRecordRows(client, "proj-1", null)
  assert.equal(results.length, 500)
  assert.equal(recordedCalls.length, 3)
  assert.equal(recordedCalls[0].afterId, undefined)
  assert.equal(recordedCalls[1].afterId, "pml-000200")
  assert.equal(recordedCalls[2].afterId, "pml-000400")
})

test("loadPipingMaterialRecordRows filters by exact mixed-case ident code", async () => {
  const recordedCalls: any[] = []

  const client = createMockPmlClient(({ projectId, identCode, afterId, limit }) => {
    recordedCalls.push({ projectId, identCode, afterId, limit })
    return {
      data: [
        {
          id: "pml-1",
          project_id: projectId,
          mrr_number: "MRR-1",
          ident_code: "Heat-ab12",
          trace_number: "T-1",
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      error: null,
    }
  })

  const results = await loadPipingMaterialRecordRows(client, "proj-1", "Heat-ab12")
  assert.equal(results.length, 1)
  assert.equal(recordedCalls.length, 1)
  assert.equal(recordedCalls[0].identCode, "Heat-ab12")
})

test("loadPipingMaterialRecordRows throws on query error and does not treat failure as empty", async () => {
  const client = createMockPmlClient(() => {
    return {
      data: null,
      error: { code: "42501", message: "permission denied for table piping_material_records" },
    }
  })

  await assert.rejects(
    () => loadPipingMaterialRecordRows(client, "proj-1", null),
    /permission/i,
  )
})

test("loadPipingMaterialRecordRows detects non-advancing pagination cursor", async () => {
  // Page returned exactly 200 rows, but cursor repeats
  const stuckRows = Array.from({ length: 200 }, () => ({
    id: "pml-stuck-id",
    project_id: "proj-1",
    mrr_number: "MRR-1",
    ident_code: "IDN-1",
    trace_number: "TR-1",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  const client = createMockPmlClient(() => {
    return { data: stuckRows, error: null }
  })

  await assert.rejects(
    () => loadPipingMaterialRecordRows(client, "proj-1", null),
    /PML pagination did not advance\./,
  )
})
