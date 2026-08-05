import assert from "node:assert/strict"
import {
  loadProjectGeography,
  createSubcontractor,
  updateSubcontractorStatus,
} from "./supabase-project-geography-repository"

function createFakeGeographyClient(_projectId = "proj-1") {
  const queries: string[] = []

  const client: any = {
    from(table: string) {
      queries.push(`from:${table}`)
      return {
        select(_cols: string) {
          queries.push(`select:${table}`)
          return {
            eq(col: string, val: string) {
              queries.push(`eq:${col}:${val}`)
              return this
            },
            in(col: string, vals: any[]) {
              queries.push(`in:${col}:${vals.join(",")}`)
              return this
            },
            order(_col: string) {
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
                      id: "sub-1",
                      project_id: payload.project_id,
                      code: payload.code,
                      description: payload.description,
                      contact_details: payload.contact_details,
                      status: "active",
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
            eq(col1: string, val1: string) {
              queries.push(`eq:${col1}:${val1}`)
              return {
                eq(col2: string, val2: string) {
                  queries.push(`eq:${col2}:${val2}`)
                  return {
                    select() {
                      return {
                        single() {
                          return Promise.resolve({
                            data: {
                              id: val1,
                              project_id: val2,
                              code: "SUB-1",
                              description: "Sub 1",
                              contact_details: null,
                              status: payload.status,
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
          }
        },
      }
    },
  }

  return { client, queries }
}

async function runGeographyTests() {
  const { client, queries } = createFakeGeographyClient("proj-1")

  await loadProjectGeography(client, "proj-1")
  assert.ok(queries.includes("from:project_units"))
  assert.ok(queries.includes("eq:project_id:proj-1"))

  const sub = await createSubcontractor(client, "proj-1", {
    code: "sub-a",
    description: "Subcontractor A",
    contactDetails: null,
  })
  assert.equal(sub.code, "SUB-A")
  assert.equal(sub.projectId, "proj-1")

  const updatedSub = await updateSubcontractorStatus(client, "proj-1", "sub-1", "archived")
  assert.equal(updatedSub.status, "archived")
  assert.ok(queries.includes("eq:id:sub-1"))
  assert.ok(queries.includes("eq:project_id:proj-1"))

  console.log("All supabase-project-geography-repository.test.ts assertions passed!")
}

runGeographyTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
