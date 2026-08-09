import assert from "node:assert/strict"
import {
  loadExtendedReferences,
  createDevice,
  saveAssemblySettings,
  listDeviceUserCandidates,
  assignDeviceUser,
} from "./supabase-extended-reference-repository"

function createFakeExtendedClient(_projectId = "proj-1") {
  const queries: string[] = []

  const client: any = {
    rpc(name: string, payload: any) {
      queries.push(`rpc:${name}:${JSON.stringify(payload)}`)
      return Promise.resolve({
        data: [{ membership_id: "member-1", full_name: "Operator", email: "operator@example.test", device_user_id: null, device_id: null, device_code: null, is_assigned: false }],
        error: null,
      })
    },
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
                      id: "dev-1",
                      project_id: payload.project_id,
                      code: payload.code,
                      description: payload.description,
                      status: "active",
                    },
                    error: null,
                  })
                },
              }
            },
          }
        },
        upsert(payload: any, options?: any) {
          queries.push(`upsert-options:${table}:${JSON.stringify(options ?? {})}`)
          queries.push(`upsert:${table}:${JSON.stringify(payload)}`)
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      project_id: payload.project_id,
                      enabled: payload.enabled,
                      default_subcontractor_id: payload.default_subcontractor_id,
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

async function runExtendedRepositoryTests() {
  const { client, queries } = createFakeExtendedClient("proj-1")

  const loaded = await loadExtendedReferences(client, "proj-1")
  assert.equal(loaded.assemblySettings.enabled, false)
  assert.ok(queries.includes("from:project_devices"))
  assert.ok(queries.includes("from:project_device_users"))
  assert.ok(queries.includes("from:project_spooling_material_types"))
  assert.ok(queries.includes("from:project_spooling_material_classes"))
  assert.ok(queries.includes("from:project_spooling_checklist_items"))
  assert.ok(queries.includes("from:project_ral_codes"))
  assert.ok(queries.includes("from:project_paint_matrix_rules"))
  assert.ok(queries.includes("from:project_assembly_settings"))

  const dev = await createDevice(client, "proj-1", {
    code: "pda-1",
    description: "PDA Unit 1",
  })
  assert.equal(dev.code, "PDA-1")

  const candidates = await listDeviceUserCandidates(client, "proj-1")
  assert.equal(candidates[0]?.email, "operator@example.test")
  assert.ok(queries.some((query) => query.startsWith("rpc:list_tracking_device_user_candidates:")))

  await assignDeviceUser(client, "proj-1", { membershipId: "member-1", deviceId: "dev-1" })
  assert.ok(queries.some((query) => query.includes('upsert:project_device_users:{"project_id":"proj-1","membership_id":"member-1","device_id":"dev-1","status":"active"}')))
  assert.ok(queries.includes('upsert-options:project_device_users:{"onConflict":"project_id,membership_id"}'))

  const assembly = await saveAssemblySettings(client, "proj-1", true, "sub-1")
  assert.equal(assembly.enabled, true)
  assert.equal(assembly.defaultSubcontractorId, "sub-1")

  console.log("All supabase-extended-reference-repository.test.ts assertions passed!")
}

runExtendedRepositoryTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
