import assert from "node:assert/strict"
import test from "node:test"
import { loadProjectCatalogMetadata } from "./supabase-project-catalog"

test("metadata query reads only explicitly available project IDs", async () => {
  const calls: unknown[] = []
  const row = {
    id: "allowed",
    owner_name: "Owner",
    contractor_name: "Contractor",
    contract_number: null,
  }
  const client = {
    from(table: string) {
      calls.push(table)
      return {
        select(columns: string) {
          calls.push(columns)
          return {
            in(column: string, ids: string[]) {
              calls.push([column, ids])
              return Promise.resolve({ data: [row], error: null })
            },
          }
        },
      }
    },
  } as never
  assert.deepEqual(await loadProjectCatalogMetadata(client, ["allowed"]), [row])
  assert.deepEqual(calls, [
    "projects",
    "id, owner_name, contractor_name, contract_number",
    ["id", ["allowed"]],
  ])
})

test("no project access means no metadata query", async () => {
  const client = {
    from() {
      throw new Error("must not query")
    },
  } as never
  assert.deepEqual(await loadProjectCatalogMetadata(client, []), [])
})

test("metadata failures are visible but do not disclose raw database error details", async () => {
  const client = {
    from() {
      return {
        select() {
          return {
            in() {
              return Promise.resolve({
                data: null,
                error: { message: "internal database error" },
              })
            },
          }
        },
      }
    },
  } as never
  await assert.rejects(() => loadProjectCatalogMetadata(client, ["allowed"]), {
    message: "Project details could not be loaded.",
  })
})
