import assert from "node:assert/strict"
import {
  loadExecutionReferences,
  createProjectTeam,
  createProjectSystem,
  createProjectSubsystem,
} from "./supabase-execution-reference-repository"

function createFakeExecutionClient(projectId = "proj-1") {
  const queries: string[] = []

  const client: any = {
    from(table: string) {
      queries.push(`from:${table}`)
      return {
        select(cols: string) {
          queries.push(`select:${table}`)
          return {
            eq(col: string, val: string) {
              queries.push(`eq:${col}:${val}`)
              return this
            },
            order(col: string) {
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
                      id: "new-1",
                      project_id: payload.project_id,
                      code: payload.code,
                      description: payload.description,
                      team_type: payload.team_type || "line_check",
                      system_id: payload.system_id || "sys-1",
                      status: "active",
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

  console.log("All supabase-execution-reference-repository.test.ts assertions passed!")
}

runExecutionRepositoryTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
