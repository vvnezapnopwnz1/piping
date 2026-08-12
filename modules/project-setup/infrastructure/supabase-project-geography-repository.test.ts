import assert from "node:assert/strict"
import {
  loadProjectGeography,
  createSubcontractor,
  createUnit,
  createAreaClassification,
  updateSubcontractorStatus,
} from "./supabase-project-geography-repository"

/** Rows a real insert returns on top of the submitted payload, per table. */
const INSERT_ECHO: Record<string, Record<string, unknown>> = {
  project_area_classifications: { project_units: { code: "U-100" } },
}

function createFakeGeographyClient(
  _projectId = "proj-1",
  insertError: { code?: string; message?: string } | null = null
) {
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
                  if (insertError) {
                    return Promise.resolve({ data: null, error: insertError })
                  }
                  return Promise.resolve({
                    data: {
                      id: `${table}-1`,
                      status: "active",
                      ...payload,
                      ...(INSERT_ECHO[table] ?? {}),
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

  // Unit → Area Classification → PDS Area: the first two links had no writer at all, so the
  // Area Classification select in Add PDS Area could only ever offer "(None)".
  const unit = await createUnit(client, "proj-1", { code: "u-100", description: " Unit 100 " })
  assert.equal(unit.code, "U-100")
  assert.equal(unit.description, "Unit 100")
  assert.equal(unit.projectId, "proj-1")
  assert.equal(unit.status, "active")
  assert.ok(queries.some((query) => query.startsWith("insert:project_units:")))

  const areaClassification = await createAreaClassification(client, "proj-1", {
    code: "ac-1",
    description: " Area 1 ",
    unitId: "unit-1",
  })
  assert.equal(areaClassification.code, "AC-1")
  assert.equal(areaClassification.description, "Area 1")
  assert.equal(areaClassification.projectId, "proj-1")
  assert.equal(areaClassification.unitId, "unit-1")
  assert.equal(areaClassification.unitCode, "U-100")
  assert.ok(
    queries.some((query) => query.startsWith("insert:project_area_classifications:")),
    "area classification must be inserted into its own table"
  )
  assert.ok(
    queries.some((query) => query.includes('"unit_id":"unit-1"')),
    "the selected unit must reach the insert payload"
  )

  // Re-submitting the same code hits `unique (project_id, code)`; the operator must see a safe
  // message and no second row, not a raw Postgres error.
  const duplicate = createFakeGeographyClient("proj-1", {
    code: "23505",
    message: 'duplicate key value violates unique constraint "project_units_project_id_code_key"',
  })
  await assert.rejects(
    () => createUnit(duplicate.client, "proj-1", { code: "U-100", description: "Unit 100" }),
    /A reference with this code already exists\./
  )
  await assert.rejects(
    () =>
      createAreaClassification(duplicate.client, "proj-1", {
        code: "AC-1",
        description: "Area 1",
        unitId: "unit-1",
      }),
    /A reference with this code already exists\./
  )

  console.log("All supabase-project-geography-repository.test.ts assertions passed!")
}

runGeographyTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
