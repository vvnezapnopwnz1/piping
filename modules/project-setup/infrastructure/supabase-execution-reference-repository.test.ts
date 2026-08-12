import assert from "node:assert/strict"
import {
  loadExecutionReferences,
  createProjectTeam,
  createProjectSystem,
  createProjectSubsystem,
  createUnitTimeReference,
  createPunchCode,
  createLocation,
  createLocationCategory,
  updateLocationCapacity,
} from "./supabase-execution-reference-repository"

function createFakeExecutionClient(_projectId = "proj-1") {
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
            order(_col: string) {
              return Promise.resolve({ data: [], error: null })
            },
            maybeSingle() {
              return Promise.resolve({ data: null, error: null })
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
                      id: table === "project_unit_time_references" ? "ut-new" : "new-1",
                      project_id: payload.project_id,
                      code: payload.code,
                      description: payload.description,
                      team_type: payload.team_type || "line_check",
                      system_id: payload.system_id || "sys-1",
                      activity: payload.activity,
                      project_ut: payload.project_ut,
                      standard_reference: payload.standard_reference,
                      category_id: payload.category_id,
                      mapped_progress_columns: payload.mapped_progress_columns,
                      capacity: payload.capacity,
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
            eq(col: string, val: string) {
              queries.push(`eq:${col}:${val}`)
              return this
            },
            then(resolve: (value: { error: null }) => void) {
              resolve({ error: null })
            },
          }
        },
      }
    },
  }

  return { client, queries }
}

async function runExecutionRepositoryTests() {
  const { client, queries } = createFakeExecutionClient("proj-1")

  await loadExecutionReferences(client, "proj-1")
  assert.ok(queries.includes("from:project_teams"))
  assert.ok(queries.includes("from:project_systems"))
  assert.ok(queries.includes("from:project_subsystems"))
  assert.ok(queries.includes("from:project_line_services"))
  assert.ok(queries.includes("from:project_location_categories"))
  assert.ok(queries.includes("from:project_locations"))
  assert.ok(queries.includes("from:project_pressure_units"))
  assert.ok(queries.includes("from:project_unit_time_references"))
  assert.ok(queries.includes("from:project_punch_codes"))

  const team = await createProjectTeam(client, "proj-1", {
    code: "team-1",
    description: "Line Check 1",
    teamType: "line_check",
  })
  assert.equal(team.code, "TEAM-1")

  const sys = await createProjectSystem(client, "proj-1", {
    code: "sys-1",
    description: "System 1",
  })
  assert.equal(sys.code, "SYS-1")

  const sub = await createProjectSubsystem(client, "proj-1", {
    systemId: "sys-1",
    code: "sub-1",
    description: "Subsystem 1",
  })
  assert.equal(sub.code, "SUB-1")

  const unitTime = await createUnitTimeReference(client, "proj-1", {
    activity: "flange_jointing",
    projectUt: 12,
    standardReference: "STD-FLANGE",
  })
  assert.equal(unitTime.id, "ut-new")
  assert.equal(unitTime.activity, "FLANGE_JOINTING")

  const punchCode = await createPunchCode(client, "proj-1", {
    code: "p-001",
    description: "Missing support",
  })
  assert.equal(punchCode.code, "P-001")
  assert.equal(punchCode.description, "Missing support")

  const location = await createLocation(client, "proj-1", {
    categoryId: "cat-1",
    code: "yard-1",
    description: "Yard 1",
    mappedProgressColumns: ["start_fab"],
    capacity: 25,
  })
  assert.equal(location.capacity, 25)
  assert.ok(queries.some((query) => query.includes('"capacity":25')))

  const category = await createLocationCategory(client, "proj-1", {
    code: "yard",
    description: "Laydown yard",
  })
  assert.equal(category.code, "YARD")

  await updateLocationCapacity(client, "proj-1", "location-1", 30)
  assert.ok(queries.includes('update:project_locations:{"capacity":30}'))

  console.log("All supabase-execution-reference-repository.test.ts assertions passed!")
}

runExecutionRepositoryTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
