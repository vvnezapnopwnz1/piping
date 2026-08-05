import assert from "node:assert/strict"
import {
  loadSystemReferentials,
  createMaterialType,
  setMaterialTypeStatus,
} from "./supabase-system-referential-repository"

// Fake Supabase Client
function createFakeClient(canManage = true) {
  const queries: string[] = []

  const client: any = {
    from(table: string) {
      queries.push(`from:${table}`)
      return {
        select(cols: string) {
          queries.push(`select:${table}:${cols}`)
          return {
            eq(col: string, val: string) {
              queries.push(`eq:${col}:${val}`)
              return this
            },
            order(col: string, opts: any) {
              queries.push(`order:${col}:${opts.ascending}`)
              if (table === "system_reference_entries") {
                return Promise.resolve({
                  data: [
                    {
                      id: "mat-1",
                      kind: "material_type",
                      code: "CS",
                      description: "Carbon Steel",
                      status: "active",
                      created_at: "2026-01-01T00:00:00Z",
                      updated_at: "2026-01-01T00:00:00Z",
                    },
                  ],
                  error: null,
                })
              }
              if (table === "system_film_quantity_rules") {
                return {
                  order(_col2: string) {
                    return Promise.resolve({
                      data: [
                        {
                          id: "film-1",
                          diameter_from_inch: 2,
                          diameter_to_inch: 4,
                          thickness_from_m: 1,
                          thickness_to_m: 2,
                          film_count: 2,
                        },
                      ],
                      error: null,
                    })
                  },
                }
              }
              if (table === "system_ut_calculation_rules") {
                return Promise.resolve({
                  data: [
                    {
                      id: "ut-1",
                      diameter_from_inch: 2,
                      diameter_to_inch: 4,
                      coefficient_diameter: 0.5,
                      coefficient_rating: 1.2,
                    },
                  ],
                  error: null,
                })
              }
              return Promise.resolve({ data: [], error: null })
            },
          }
        },
        insert(payload: any) {
          queries.push(`insert:${table}:${JSON.stringify(payload)}`)
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      id: "mat-new",
                      kind: "material_type",
                      code: payload.code,
                      description: payload.description,
                      status: "active",
                      created_at: "2026-01-01T00:00:00Z",
                      updated_at: "2026-01-01T00:00:00Z",
                    },
                    error: null,
                  })
                },
              }
            },
          }
        },
        update(payload: any) {
          queries.push(`update:${table}:${JSON.stringify(payload)}`)
          return {
            eq(col: string, val: string) {
              queries.push(`eq:${col}:${val}`)
              return this
            },
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      id: "mat-1",
                      kind: "material_type",
                      code: "CS-MOD",
                      description: "Carbon Steel Modified",
                      status: payload.status ?? "active",
                      created_at: "2026-01-01T00:00:00Z",
                      updated_at: "2026-01-01T00:00:00Z",
                    },
                    error: null,
                  })
                },
              }
            },
          }
        },
      }
    },
    rpc(fnName: string, args: any) {
      queries.push(`rpc:${fnName}:${JSON.stringify(args)}`)
      return Promise.resolve({ data: canManage, error: null })
    },
  }

  return { client, queries }
}

async function runTests() {
  const { client, queries } = createFakeClient(true)

  const loaded = await loadSystemReferentials(client)
  assert.equal(loaded.canManage, true)
  assert.equal(loaded.materialTypes.length, 1)
  assert.equal(loaded.materialTypes[0].code, "CS")
  assert.equal(loaded.filmQuantityRules.length, 1)
  assert.equal(loaded.utCalculationRules.length, 1)
  assert.deepEqual(loaded.torquingMethods, ["Manual", "Torquing", "Tensioning"])

  assert.ok(queries.includes("from:system_reference_entries"))
  assert.ok(queries.includes("from:system_film_quantity_rules"))
  assert.ok(queries.includes("from:system_ut_calculation_rules"))
  assert.ok(queries.includes('rpc:current_user_has_global_capability:{"requested_capability":"system_referential.manage"}'))

  // Material type insert
  const created = await createMaterialType(client, { code: "ss", description: "Stainless Steel" })
  assert.equal(created.code, "SS")

  // Material type status change
  const updated = await setMaterialTypeStatus(client, "mat-1", "archived")
  assert.equal(updated.status, "archived")

  // Verify no delete queries issued
  assert.equal(queries.some((q) => q.includes("delete")), false)

  console.log("All supabase-system-referential-repository.test.ts assertions passed!")
}

runTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
