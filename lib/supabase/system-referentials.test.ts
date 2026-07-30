import assert from "node:assert/strict"
import {
  loadSystemReferentials,
  createMaterialType,
  updateMaterialType,
  setMaterialTypeStatus,
  deleteMaterialType,
  SYSTEM_REFERENTIAL_SELECT,
} from "./system-referentials"

const sampleRow = {
  id: "entry-1",
  kind: "material_type",
  code: "CS",
  description: "Carbon Steel",
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

async function runTests() {
  const calls: Array<unknown> = []

  const mockClient = {
    from(table: string) {
      assert.equal(table, "system_reference_entries")
      return {
        select(columns: string) {
          calls.push(["select", columns])
          return {
            order(col1: string, opts1: unknown) {
              calls.push(["order", col1, opts1])
              return {
                order(col2: string, opts2: unknown) {
                  calls.push(["order", col2, opts2])
                  return Promise.resolve({ data: [sampleRow], error: null })
                },
              }
            },
          }
        },
        insert(payload: unknown) {
          calls.push(["insert", payload])
          return {
            select(columns: string) {
              calls.push(["select", columns])
              return {
                single: async () => ({ data: sampleRow, error: null }),
              }
            },
          }
        },
        update(payload: unknown) {
          calls.push(["update", payload])
          return {
            eq(col1: string, val1: string) {
              calls.push(["eq", col1, val1])
              return {
                eq(col2: string, val2: string) {
                  calls.push(["eq", col2, val2])
                  return {
                    select(columns: string) {
                      calls.push(["select", columns])
                      return {
                        single: async () => ({ data: sampleRow, error: null }),
                      }
                    },
                  }
                },
              }
            },
          }
        },
        delete() {
          calls.push(["delete"])
          return {
            eq(col1: string, val1: string) {
              calls.push(["eq", col1, val1])
              return {
                eq(col2: string, val2: string) {
                  calls.push(["eq", col2, val2])
                  return {
                    select(columns: string) {
                      calls.push(["select", columns])
                      return {
                        single: async () => ({ data: { id: "entry-1" }, error: null }),
                      }
                    },
                  }
                },
              }
            },
          }
        },
      }
    },
    rpc(name: string) {
      calls.push(["rpc", name])
      return Promise.resolve({ data: true, error: null })
    },
  } as never

  // 1. Test loadSystemReferentials
  const loaded = await loadSystemReferentials(mockClient)
  assert.equal(loaded.canManage, true)
  assert.equal(loaded.entries.length, 1)
  assert.equal(loaded.entries[0].id, "entry-1")
  assert.deepEqual(calls, [
    ["select", SYSTEM_REFERENTIAL_SELECT],
    ["order", "kind", { ascending: true }],
    ["order", "code", { ascending: true }],
    ["rpc", "is_platform_admin"],
  ])

  // 2. Test createMaterialType
  calls.length = 0
  const created = await createMaterialType(mockClient, {
    code: " CS ",
    description: " Carbon Steel ",
  })
  assert.equal(created.id, "entry-1")
  assert.deepEqual(calls, [
    ["insert", { kind: "material_type", code: "CS", description: "Carbon Steel" }],
    ["select", SYSTEM_REFERENTIAL_SELECT],
  ])

  // 3. Test updateMaterialType
  calls.length = 0
  const updated = await updateMaterialType(mockClient, "entry-1", {
    code: " CS ",
    description: " Updated Carbon Steel ",
  })
  assert.equal(updated.id, "entry-1")
  assert.deepEqual(calls, [
    ["update", { code: "CS", description: "Updated Carbon Steel" }],
    ["eq", "id", "entry-1"],
    ["eq", "kind", "material_type"],
    ["select", SYSTEM_REFERENTIAL_SELECT],
  ])

  // 4. Test setMaterialTypeStatus
  calls.length = 0
  const statusUpdated = await setMaterialTypeStatus(mockClient, "entry-1", "inactive")
  assert.equal(statusUpdated.id, "entry-1")
  assert.deepEqual(calls, [
    ["update", { status: "inactive" }],
    ["eq", "id", "entry-1"],
    ["eq", "kind", "material_type"],
    ["select", SYSTEM_REFERENTIAL_SELECT],
  ])

  // 5. Test deleteMaterialType
  calls.length = 0
  await deleteMaterialType(mockClient, "entry-1")
  assert.deepEqual(calls, [
    ["delete"],
    ["eq", "id", "entry-1"],
    ["eq", "kind", "material_type"],
    ["select", "id"],
  ])

  // 6. Test Error Handling
  const errorClient = {
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => Promise.resolve({ data: null, error: { message: "db select error" } }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: { message: "db insert error" } }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { message: "db update error" } }),
            }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { message: "db delete error" } }),
            }),
          }),
        }),
      }),
    }),
    rpc: () => Promise.resolve({ data: null, error: { message: "rpc error" } }),
  } as never

  await assert.rejects(
    () => loadSystemReferentials(errorClient),
    (err: unknown) => err instanceof Error && err.message === "db select error"
  )

  await assert.rejects(
    () => createMaterialType(errorClient, { code: "CS", description: "Desc" }),
    (err: unknown) => err instanceof Error && err.message === "db insert error"
  )

  await assert.rejects(
    () => updateMaterialType(errorClient, "entry-1", { code: "CS", description: "Desc" }),
    (err: unknown) => err instanceof Error && err.message === "db update error"
  )

  await assert.rejects(
    () => setMaterialTypeStatus(errorClient, "entry-1", "inactive"),
    (err: unknown) => err instanceof Error && err.message === "db update error"
  )

  await assert.rejects(
    () => deleteMaterialType(errorClient, "entry-1"),
    (err: unknown) => err instanceof Error && err.message === "db delete error"
  )

  const rpcErrorClient = {
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => Promise.resolve({ data: [sampleRow], error: null }),
        }),
      }),
    }),
    rpc: () => Promise.resolve({ data: null, error: { message: "rpc error" } }),
  } as never

  await assert.rejects(
    () => loadSystemReferentials(rpcErrorClient),
    (err: unknown) => err instanceof Error && err.message === "rpc error"
  )

  console.log("All lib/supabase/system-referentials.test.ts assertions passed!")
}

void runTests()
